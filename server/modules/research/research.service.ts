import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { eq, inArray, count, desc, sql } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { materials, researchPlans, globalConfigs } from '@server/database/schema';
import { LLMService } from '@server/common/services/llm.service';
import type {
  ResearchPlanItem,
  ResearchGenerateResponse,
  ResearchPlanRecord,
  ResearchPlanListResponse,
  AvailableReagent,
} from '@shared/types';

interface LlmPlanRaw {
  title: string;
  angle: string;
  targets: string[];
  pathways: string[];
  reasoning: string;
  estimatedSavings: number;
}

interface LlmPlansResponse {
  plans: LlmPlanRaw[];
}

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly llmService: LLMService,
  ) {}

  async generate(
    direction: string,
    apiConfig: { apiBaseUrl: string; apiKey: string; modelName: string },
  ): Promise<ResearchGenerateResponse> {
    if (!direction || !direction.trim()) {
      throw new BadRequestException('研究方向不能为空');
    }

    const { apiBaseUrl, apiKey, modelName } = apiConfig;

    if (!apiBaseUrl || !apiKey || !modelName) {
      throw new BadRequestException(
        'API 配置不完整：请先在系统设置中配置 API Base URL、API Key 和模型名称，或在请求中传入',
      );
    }

    // 1. 读取相关试剂（抗体、质粒、引物）
    const reagentCategories = ['antibody', 'plasmid', 'primer'];
    const allReagents = await this.db
      .select({
        id: materials.id,
        name: materials.name,
        category: materials.category,
        catalogNo: materials.catalogNo,
        stock: materials.stock,
      })
      .from(materials)
      .where(inArray(materials.category, reagentCategories));

    // 2. 构造 LLM prompt
    const reagentInfo = allReagents
      .map((r) => `- ${r.name} (货号: ${r.catalogNo}, 类别: ${r.category}, 库存: ${r.stock})`)
      .join('\n');

    const systemPrompt = `你是一个资深的科研课题设计专家，擅长根据研究方向推荐有价值的研究方案。
请根据用户提供的研究方向，生成 3-5 个具体的研究方案。
每个方案必须包含：title（方案名称）、angle（研究角度，简述，不超过 50 字）、targets（核心靶点基因名称数组，3-6 个）、pathways（相关信号通路数组，2-4 个）、reasoning（推理说明，100-200 字）、estimatedSavings（预计可节省的研究经费，数字，单位元）。
请严格以 JSON 格式返回，格式为 {"plans": [...]}。`;

    const userPrompt = `研究方向：${direction}

实验室现有试剂（抗体/质粒/引物）：
${reagentInfo || '（暂无相关试剂）'}

请基于上述研究方向和现有试剂，推荐 3-5 个研究方案。`;

    // 3. 调用 LLM
    let llmResult: LlmPlansResponse;
    try {
      llmResult = await this.llmService.chatJson<LlmPlansResponse>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { apiBaseUrl, apiKey, modelName, temperature: 0.3 },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'LLM 调用失败';
      this.logger.error(`课题生成失败: ${msg}`);
      throw new BadRequestException(`AI 生成失败：${msg}`);
    }

    const rawPlans = llmResult.plans || [];
    if (rawPlans.length === 0) {
      throw new BadRequestException('AI 未返回任何方案，请重试');
    }

    // 4. 匹配试剂并组装结果
    const plans: ResearchPlanItem[] = rawPlans.map((plan, idx) => {
      const matched = this.matchReagents(plan.targets, allReagents);
      return {
        id: `plan-${idx}-${Date.now()}`,
        title: plan.title || `方案 ${idx + 1}`,
        angle: plan.angle || '',
        targets: Array.isArray(plan.targets) ? plan.targets : [],
        pathways: Array.isArray(plan.pathways) ? plan.pathways : [],
        reasoning: plan.reasoning || '',
        estimatedSavings: Number(plan.estimatedSavings) || 0,
        availableReagents: matched,
      };
    });

    return { plans };
  }

  private matchReagents(
    targets: string[],
    reagents: { id: string; name: string; category: string | null; catalogNo: string; stock: number | null }[],
  ): AvailableReagent[] {
    const matched: AvailableReagent[] = [];
    const matchedIds = new Set<string>();

    const targetLower = targets.map((t) => t.toLowerCase().trim());

    for (const reagent of reagents) {
      const nameLower = reagent.name.toLowerCase();
      const catalogLower = reagent.catalogNo.toLowerCase();
      const stock = reagent.stock ?? 0;

      let isMatch = false;
      for (const target of targetLower) {
        if (!target) continue;
        if (nameLower.includes(target) || catalogLower.includes(target)) {
          isMatch = true;
          break;
        }
      }

      if (isMatch && !matchedIds.has(reagent.id)) {
        matchedIds.add(reagent.id);
        matched.push({
          id: reagent.id,
          name: reagent.name,
          category: reagent.category || 'other',
          stock,
          availability: stock > 10 ? 'sufficient' : stock > 0 ? 'partial' : 'none',
        });
      }
    }

    return matched;
  }

  async savePlan(data: {
    title: string;
    direction: string;
    content: Record<string, unknown>;
    reagentsUsed: Record<string, unknown>[];
    estimatedSavings: number;
  }): Promise<{ id: string; success: boolean }> {
    if (!data.title || !data.title.trim()) {
      throw new BadRequestException('方案标题不能为空');
    }

    const targets = Array.isArray((data.content as { targets?: string[] }).targets)
      ? (data.content as { targets: string[] }).targets
      : [];
    const pathways = Array.isArray((data.content as { pathways?: string[] }).pathways)
      ? (data.content as { pathways: string[] }).pathways
      : [];

    const result = await this.db
      .insert(researchPlans)
      .values({
        title: data.title.trim(),
        researchDirection: data.direction || '',
        targets,
        pathways,
        availableReagents: data.reagentsUsed as unknown as object[],
        estimatedSavings: String(data.estimatedSavings || 0),
      })
      .returning({ id: researchPlans.id });

    const id = result[0]?.id;
    if (!id) {
      throw new BadRequestException('保存方案失败');
    }

    this.logger.log(`Research plan saved: ${id}`);
    return { id, success: true };
  }

  async getPlanList(page: number, pageSize: number): Promise<ResearchPlanListResponse> {
    const pageNum = Math.max(1, page);
    const size = Math.min(100, Math.max(1, pageSize));
    const offset = (pageNum - 1) * size;

    const [countResult, itemsRaw] = await Promise.all([
      this.db.select({ count: count() }).from(researchPlans),
      this.db
        .select({
          id: researchPlans.id,
          title: researchPlans.title,
          researchDirection: researchPlans.researchDirection,
          estimatedSavings: researchPlans.estimatedSavings,
          createdAt: researchPlans.createdAt,
        })
        .from(researchPlans)
        .orderBy(desc(researchPlans.createdAt))
        .limit(size)
        .offset(offset),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: ResearchPlanRecord[] = itemsRaw.map((item) => ({
      id: item.id,
      title: item.title,
      researchDirection: item.researchDirection || '',
      estimatedSavings: item.estimatedSavings?.toString() || '0',
      createdAt: item.createdAt || '',
    }));

    return { items, total };
  }

  async deletePlan(id: string): Promise<{ success: boolean }> {
    const result = await this.db
      .delete(researchPlans)
      .where(eq(researchPlans.id, id))
      .returning({ id: researchPlans.id });

    if (result.length === 0) {
      // 记录不存在也视为成功（幂等）
      return { success: true };
    }

    this.logger.log(`Research plan deleted: ${id}`);
    return { success: true };
  }

  async getGlobalApiConfig(): Promise<{ apiBaseUrl: string; apiKey: string; modelName: string }> {
    const configs = await this.db
      .select()
      .from(globalConfigs)
      .where(eq(globalConfigs.configKey, 'global_api'))
      .limit(1);

    if (configs.length === 0 || !configs[0].configValue) {
      return { apiBaseUrl: '', apiKey: '', modelName: '' };
    }

    try {
      const parsed = JSON.parse(configs[0].configValue);
      return {
        apiBaseUrl: parsed.apiBaseUrl || '',
        apiKey: parsed.apiKey || '',
        modelName: parsed.modelName || '',
      };
    } catch {
      return { apiBaseUrl: '', apiKey: '', modelName: '' };
    }
  }
}
