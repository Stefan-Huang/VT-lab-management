import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import type { ExpType, ProtocolAiParseResult } from '@shared/types';

const EXP_TYPE_OPTIONS: string[] = [
  'IHC', 'WB', 'qPCR', 'cell_culture', 'siRNA', 'flow', 'other',
];

@Injectable()
export class AiParseService {
  private readonly logger = new Logger(AiParseService.name);

  async parseProtocolText(
    apiBaseUrl: string,
    apiKey: string,
    modelName: string,
    text: string,
    sourceLang: 'zh' | 'en',
  ): Promise<ProtocolAiParseResult> {
    if (!apiBaseUrl || !apiKey || !modelName) {
      throw new BadRequestException('API 配置不完整');
    }

    const baseUrl = apiBaseUrl.replace(/\/$/, '');
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(text, sourceLang);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.logger.error(`AI API error: ${response.status} ${errorText.slice(0, 200)}`);
        throw new BadRequestException(`AI 识别失败: ${response.status}`);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };
      const content = data.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(content);

      return this.normalizeResult(parsed, sourceLang);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`AI parse failed: ${message}`);
      throw new BadRequestException(`AI 识别失败: ${message}`);
    }
  }

  private buildSystemPrompt(): string {
    return `你是一名专业的生物实验室 Protocol 解析专家。
你的任务是从实验文档文本中提取结构化信息，并输出 JSON 格式。
实验类型必须从以下选项中选择一个: ${EXP_TYPE_OPTIONS.join(', ')}。
输出 JSON 包含以下字段:
- title (中文标题)
- titleEn (英文标题)
- type (实验类型，必须是上述选项之一)
- summary (中文简介，200字以内)
- summaryEn (英文简介)
- content (中文完整实验步骤内容，保留步骤编号)
- contentEn (英文完整实验步骤内容，保留步骤编号)
- sourceLang (原文语言，zh 或 en)
注意：
1. 必须严格输出合法 JSON，不要有任何多余文字
2. 如果原文是中文，请翻译成英文；如果原文是英文，请翻译成中文
3. 内容要忠于原文，不要编造步骤
4. 实验类型只能从给定选项中选择，不确定时选 "other"`;
  }

  private buildUserPrompt(text: string, sourceLang: 'zh' | 'en'): string {
    return `请解析以下实验文档（语言：${sourceLang === 'zh' ? '中文' : '英文'}）：

====================
${text.slice(0, 15000)}
====================

请输出 JSON 格式的解析结果，包含 title, titleEn, type, summary, summaryEn, content, contentEn, sourceLang 字段。`;
  }

  private normalizeResult(parsed: Record<string, unknown>, sourceLang: 'zh' | 'en'): ProtocolAiParseResult {
    const typeRaw = String(parsed.type || 'other').trim();
    const type = EXP_TYPE_OPTIONS.includes(typeRaw) ? typeRaw as ExpType : 'other';

    const title = String(parsed.title || parsed.name || '').trim();
    const titleEn = String(parsed.titleEn || parsed.nameEn || parsed.title || '').trim();
    const summary = String(parsed.summary || parsed.description || '').trim();
    const summaryEn = String(parsed.summaryEn || parsed.descriptionEn || parsed.summary || '').trim();
    const content = String(parsed.content || '').trim();
    const contentEn = String(parsed.contentEn || content || '').trim();

    const detectedLang = (parsed.sourceLang === 'en' ? 'en' : sourceLang) as 'zh' | 'en';

    return {
      title,
      titleEn,
      type,
      summary,
      summaryEn,
      content,
      contentEn,
      sourceLang: detectedLang,
    };
  }

  async translateContent(
    apiBaseUrl: string,
    apiKey: string,
    modelName: string,
    text: string,
    targetLang: 'zh' | 'en',
  ): Promise<string> {
    if (!apiBaseUrl || !apiKey || !modelName) {
      throw new BadRequestException('API 配置不完整');
    }
    if (!text.trim()) return '';

    const baseUrl = apiBaseUrl.replace(/\/$/, '');
    const target = targetLang === 'zh' ? '简体中文' : 'English';
    const source = targetLang === 'zh' ? '英文' : '中文';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: `你是专业的科技翻译专家，擅长生物实验室文档翻译。
请将以下${source}实验 Protocol 翻译成${target}。
要求：术语准确，步骤编号保持不变，只输出翻译结果，不要有其他说明。`,
            },
            { role: 'user', content: text.slice(0, 15000) },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new BadRequestException(`翻译失败: ${response.status}`);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : '未知错误';
      throw new BadRequestException(`AI 翻译失败: ${message}`);
    }
  }
}
