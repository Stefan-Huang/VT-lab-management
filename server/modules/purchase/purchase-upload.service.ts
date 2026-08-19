import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { count, desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import type {
  ParsedPurchaseItem,
  UploadListResponse,
  UploadParseResponse,
  UploadRecord,
} from '@shared/types';
import { BadRequestException } from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { PurchaseParserService } from './purchase-parser.service';
import { materials, uploadRecords, globalConfigs } from '@server/database/schema';

@Injectable()
export class PurchaseUploadService {
  private readonly logger = new Logger(PurchaseUploadService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly purchaseService: PurchaseService,
    private readonly parserService: PurchaseParserService,
  ) {}

  async parseUpload(
    fileBuffer: Buffer,
    filename: string,
    llmConfig: { apiBaseUrl: string; apiKey: string; modelName: string },
  ): Promise<UploadParseResponse> {
    const inserted = await this.db
      .insert(uploadRecords)
      .values({
        filename,
        status: 'parsing',
        parsedCount: 0,
        successCount: 0,
        failedCount: 0,
      })
      .returning({ id: uploadRecords.id });
    const uploadId = inserted[0].id;

    try {
      const rows = this.parserService.parseSpreadsheet(fileBuffer, filename);
      if (rows.length === 0) {
        await this.markFailed(uploadId, '文件内容为空或无法解析');
        throw new BadRequestException('文件内容为空或无法解析');
      }

      const { apiBaseUrl, apiKey, modelName } = llmConfig;
      const parsedItems: ParsedPurchaseItem[] = [];
      let successCount = 0;
      let totalConfidence = 0;

      const BATCH_SIZE = 20;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const batchItems = await this.parserService.parseBatch(
          batch,
          apiBaseUrl,
          apiKey,
          modelName,
        );
        for (const item of batchItems) {
          const existing = await this.db
            .select()
            .from(materials)
            .where(eq(materials.catalogNo, item.catalogNo))
            .limit(1);

          const isNew = existing.length === 0;
          const oldPrice = isNew ? null : Number(existing[0].unitPrice || 0);
          const priceChange =
            oldPrice && oldPrice > 0
              ? Number(((item.unitPrice - oldPrice) / oldPrice * 100).toFixed(2))
              : null;

          parsedItems.push({ ...item, isNew, priceChange });

          if (item.confidence >= 0.6) successCount += 1;
          totalConfidence += item.confidence;
        }
      }

      const avgConfidence =
        parsedItems.length > 0
          ? Number((totalConfidence / parsedItems.length).toFixed(3))
          : 0;

      await this.db
        .update(uploadRecords)
        .set({
          status: 'success',
          parsedCount: parsedItems.length,
          successCount,
          failedCount: parsedItems.length - successCount,
        })
        .where(eq(uploadRecords.id, uploadId));

      return {
        uploadId,
        status: 'success',
        parsedItems,
        successCount,
        avgConfidence,
      };
    } catch (error) {
      const message = (error as Error).message || '解析失败';
      await this.markFailed(uploadId, message);
      throw error;
    }
  }

  async confirmUpload(
    uploadId: string,
    items: ParsedPurchaseItem[],
  ): Promise<{ success: boolean; insertedCount: number }> {
    const record = await this.db
      .select()
      .from(uploadRecords)
      .where(eq(uploadRecords.id, uploadId))
      .limit(1);

    if (record.length === 0) {
      throw new NotFoundException('上传记录不存在');
    }

    let insertedCount = 0;

    for (const item of items) {
      try {
        await this.purchaseService.manualAdd({
          name: item.name,
          category: item.category,
          catalogNo: item.catalogNo,
          specification: item.specification,
          supplier: item.supplier,
          unitPrice: item.unitPrice,
          stock: item.stock,
          purchaseDate: item.purchaseDate,
          remark: item.remark,
        });
        insertedCount += 1;
      } catch (err) {
        this.logger.warn(
          `确认入库跳过一条（货号: ${item.catalogNo}）: ${(err as Error).message}`,
        );
      }
    }

    await this.db
      .update(uploadRecords)
      .set({
        status: 'success',
        successCount: insertedCount,
        failedCount: items.length - insertedCount,
      })
      .where(eq(uploadRecords.id, uploadId));

    return { success: true, insertedCount };
  }

  async getUploadList(page: number, pageSize: number): Promise<UploadListResponse> {
    const offset = (page - 1) * pageSize;

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(uploadRecords)
        .orderBy(desc(uploadRecords.uploadDate))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(uploadRecords),
    ]);

    return {
      items: items.map((r): UploadRecord => ({
        id: r.id,
        filename: r.filename,
        status: r.status as UploadRecord['status'],
        uploadDate: r.uploadDate || '',
        parsedCount: r.parsedCount ?? 0,
        successCount: r.successCount ?? 0,
        failedCount: r.failedCount ?? 0,
        errorMessage: r.errorMessage || '',
        createdAt: r.createdAt || '',
      })),
      total: Number(countResult[0]?.count || 0),
    };
  }

  private async markFailed(uploadId: string, message: string): Promise<void> {
    await this.db
      .update(uploadRecords)
      .set({ status: 'failed', errorMessage: message, parsedCount: 0 })
      .where(eq(uploadRecords.id, uploadId));
  }

  async getGlobalLLMConfig(): Promise<{ apiBaseUrl: string; apiKey: string; modelName: string }> {
    const keys = ['llm_api_base_url', 'llm_api_key', 'llm_model_name'];
    const configs = await this.db
      .select()
      .from(globalConfigs)
      .where(sql`${globalConfigs.configKey} IN (${sql.join(keys.map((k) => sql`${k}`), sql`, `)})`);

    const map = new Map<string, string>();
    for (const c of configs) {
      if (c.configValue) map.set(c.configKey, c.configValue);
    }

    return {
      apiBaseUrl: map.get('llm_api_base_url') || '',
      apiKey: map.get('llm_api_key') || '',
      modelName: map.get('llm_model_name') || '',
    };
  }
}
