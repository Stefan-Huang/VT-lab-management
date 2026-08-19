import XLSX from 'xlsx';
import { Injectable, Logger } from '@nestjs/common';
import { LLMService } from '@server/common/services/llm.service';
import type { MaterialCategory, ParsedPurchaseItem } from '@shared/types';

const CATEGORY_MAP: Record<string, MaterialCategory> = {
  antibody: 'antibody',
  抗体: 'antibody',
  plasmid: 'plasmid',
  质粒: 'plasmid',
  serum: 'serum',
  血清: 'serum',
  antibiotic: 'antibiotic',
  抗生素: 'antibiotic',
  primer: 'primer',
  引物: 'primer',
  other: 'other',
  其他: 'other',
};

export function normalizeCategory(raw: string): MaterialCategory {
  if (!raw) return 'other';
  const key = String(raw).trim().toLowerCase();
  return CATEGORY_MAP[key] ?? CATEGORY_MAP[raw.trim()] ?? 'other';
}

@Injectable()
export class PurchaseParserService {
  private readonly logger = new Logger(PurchaseParserService.name);

  constructor(private readonly llmService: LLMService) {}

  /**
   * 解析表格文件为二维字符串数组
   * 优先使用 xlsx 库，失败回退到模拟数据
   */
  parseSpreadsheet(buffer: Buffer, filename: string): string[][] {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      return rows
        .filter((row) =>
          row.some((cell) => cell !== '' && cell !== null && cell !== undefined),
        )
        .map((row) => row.map((cell) => String(cell ?? '')));
    } catch (error) {
      this.logger.warn(`xlsx 解析失败，使用模拟数据: ${(error as Error).message}`);
      return this.getMockRows(filename);
    }
  }

  /**
   * 批量 LLM 解析，失败回退到启发式解析
   */
  async parseBatch(
    rows: string[][],
    apiBaseUrl: string,
    apiKey: string,
    modelName: string,
  ): Promise<ParsedPurchaseItem[]> {
    try {
      const systemPrompt = `你是一个实验室物资采购数据解析助手。用户会给你一个二维表格（第一行可能是表头也可能是数据），请将每一行解析为结构化 JSON。

输出格式（JSON 对象，包含 items 数组）：
{
  "items": [
    {
      "name": "物资名称（字符串）",
      "category": "枚举值之一：antibody/plasmid/serum/antibiotic/primer/other",
      "catalogNo": "货号（字符串）",
      "specification": "规格（字符串）",
      "supplier": "供应商（字符串）",
      "unitPrice": 数字类型的单价,
      "stock": 数字类型的数量/存量,
      "purchaseDate": "YYYY-MM-DD 格式的采购日期",
      "remark": "备注（字符串）",
      "confidence": 0 到 1 之间的数字，表示解析置信度
    }
  ]
}

要求：
1. category 必须是 antibody/plasmid/serum/antibiotic/primer/other 之一，不能是中文名
2. unitPrice 和 stock 必须是数字类型
3. 日期统一为 YYYY-MM-DD 格式
4. 缺失字段用空字符串或 0 填充，置信度相应降低
5. 如果第一行是表头（含"名称/类别/货号/规格/价格/数量"等字样），则跳过第一行
6. 只输出 JSON，不要输出额外文字或解释`;

      const userContent = `表格内容：\n${rows.map((r) => r.join(' | ')).join('\n')}`;

      const result = await this.llmService.chatJson<{ items: ParsedPurchaseItem[] }>(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        { apiBaseUrl, apiKey, modelName, temperature: 0.1 },
      );

      if (!result.items || !Array.isArray(result.items)) {
        throw new Error('LLM 返回格式缺少 items 数组');
      }

      return result.items.map((item) => ({
        name: String(item.name || ''),
        category: normalizeCategory(item.category),
        catalogNo: String(item.catalogNo || ''),
        specification: String(item.specification || ''),
        supplier: String(item.supplier || ''),
        unitPrice: Number(item.unitPrice) || 0,
        stock: Number(item.stock) || 0,
        purchaseDate: String(item.purchaseDate || ''),
        remark: String(item.remark || ''),
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0.5)),
        isNew: false,
        priceChange: null,
      }));
    } catch (error) {
      this.logger.warn(`LLM 解析失败，使用启发式解析: ${(error as Error).message}`);
      return this.heuristicParse(rows);
    }
  }

  private getMockRows(filename: string): string[][] {
    const today = new Date().toISOString().split('T')[0];
    return [
      ['名称', '类别', '货号', '规格', '供应商', '单价', '数量', '采购日期', '备注'],
      ['Protein A/G 抗体', '抗体', 'ab12345', '100μg', 'Abcam', '2580.00', '5', today, 'Western blot 用'],
      ['大肠杆菌 DH5α 感受态', '其他', 'EC001', '100μl×10', '全式金', '320.00', '10', today, ''],
      ['胎牛血清', '血清', 'FBS-001', '500ml', 'Gibco', '4800.00', '2', today, '热灭活'],
      ['氨苄青霉素', '抗生素', 'AMP-001', '100mg', 'Sigma', '180.00', '3', today, ''],
    ];
  }

  private heuristicParse(rows: string[][]): ParsedPurchaseItem[] {
    if (rows.length === 0) return [];

    const firstRow = rows[0].map((c) => c.trim());
    const hasHeader = firstRow.some((c) =>
      /名称|name|类别|category|货号|catalog|规格|spec|单价|price|数量|stock|日期|date|备注|remark/i.test(c),
    );
    const dataRows = hasHeader ? rows.slice(1) : rows;

    return dataRows.map((row): ParsedPurchaseItem => {
      const cells = [...row];
      while (cells.length < 9) cells.push('');

      const name = cells[0]?.trim() || '未命名物资';
      const category = normalizeCategory(cells[1] || '');
      const catalogNo = cells[2]?.trim() || '';
      const specification = cells[3]?.trim() || '';
      const supplier = cells[4]?.trim() || '';
      const unitPrice = Number(cells[5]?.replace(/[^0-9.]/g, '')) || 0;
      const stock = parseInt(cells[6]?.replace(/[^0-9]/g, ''), 10) || 0;
      let purchaseDate = cells[7]?.trim() || '';
      if (purchaseDate && !/^\d{4}-\d{2}-\d{2}/.test(purchaseDate)) {
        const d = new Date(purchaseDate);
        if (!Number.isNaN(d.getTime())) {
          purchaseDate = d.toISOString().split('T')[0];
        } else {
          purchaseDate = new Date().toISOString().split('T')[0];
        }
      }
      const remark = cells[8]?.trim() || '';

      let confidence = 0.6;
      if (name.length > 2) confidence += 0.05;
      if (catalogNo.length > 0) confidence += 0.1;
      if (unitPrice > 0) confidence += 0.1;
      if (stock > 0) confidence += 0.05;
      if (category !== 'other') confidence += 0.05;
      confidence = Math.min(0.9, Math.max(0.3, confidence));

      return {
        name,
        category,
        catalogNo,
        specification,
        supplier,
        unitPrice,
        stock,
        purchaseDate,
        remark,
        confidence,
        isNew: false,
        priceChange: null,
      };
    });
  }
}
