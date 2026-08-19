import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';

import type {
  ManualPurchaseResponse,
  MaterialCategory,
  PriceHistoryByCatalogResponse,
} from '@shared/types';
import { LLMService } from '@server/common/services/llm.service';
import { PurchaseParserService } from './purchase-parser.service';

import {
  materials,
  purchaseRecords,
} from '@server/database/schema';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ============== 价格历史（按货号） ==============
  async getPriceHistoryByCatalog(catalogNo: string): Promise<PriceHistoryByCatalogResponse> {
    if (!catalogNo) {
      return {
        exists: false,
        avgPrice: null,
        lastPrice: null,
        history: [],
      };
    }

    const material = await this.db
      .select()
      .from(materials)
      .where(eq(materials.catalogNo, catalogNo))
      .limit(1);

    if (material.length === 0) {
      return {
        exists: false,
        avgPrice: null,
        lastPrice: null,
        history: [],
      };
    }

    const records = await this.db
      .select()
      .from(purchaseRecords)
      .where(eq(purchaseRecords.materialId, material[0].id))
      .orderBy(desc(purchaseRecords.purchaseDate));

    if (records.length === 0) {
      const currentPrice = Number(material[0].unitPrice || 0);
      return {
        exists: true,
        avgPrice: currentPrice,
        lastPrice: currentPrice,
        history: [],
      };
    }

    const prices = records.map((r) => Number(r.price));
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const lastPrice = prices[0];

    return {
      exists: true,
      avgPrice: Number(avgPrice.toFixed(2)),
      lastPrice: Number(lastPrice),
      history: records.map((r) => ({
        date: r.purchaseDate.toString(),
        price: Number(r.price),
        supplier: r.supplier || '',
      })),
    };
  }

  // ============== 手动添加采购 ==============
  async manualAdd(data: {
    name: string;
    category: MaterialCategory;
    catalogNo: string;
    specification: string;
    supplier: string;
    unitPrice: number;
    stock: number;
    purchaseDate: string;
    remark: string;
  }): Promise<ManualPurchaseResponse> {
    if (!data.name) throw new BadRequestException('名称不能为空');
    if (!data.catalogNo) throw new BadRequestException('货号不能为空');
    if (!data.category) throw new BadRequestException('类别不能为空');
    if (data.unitPrice <= 0) throw new BadRequestException('单价必须大于 0');
    if (data.stock < 0) throw new BadRequestException('存量不能为负');

    const existing = await this.db
      .select()
      .from(materials)
      .where(eq(materials.catalogNo, data.catalogNo))
      .limit(1);

    const isNew = existing.length === 0;
    const oldPrice = isNew ? null : Number(existing[0].unitPrice || 0);
    const priceChange =
      oldPrice && oldPrice > 0
        ? Number(((data.unitPrice - oldPrice) / oldPrice * 100).toFixed(2))
        : null;

    let materialId: string;

    if (isNew) {
      const inserted = await this.db
        .insert(materials)
        .values({
          name: data.name,
          category: data.category,
          catalogNo: data.catalogNo,
          specification: data.specification,
          supplier: data.supplier,
          unitPrice: String(data.unitPrice),
          stock: data.stock,
          purchaseDate: data.purchaseDate,
          remark: data.remark,
        })
        .returning({ id: materials.id });
      materialId = inserted[0].id;
    } else {
      const mat = existing[0];
      const updated = await this.db
        .update(materials)
        .set({
          stock: (mat.stock || 0) + data.stock,
          unitPrice: String(data.unitPrice),
          purchaseDate: data.purchaseDate,
          name: data.name || mat.name,
          specification: data.specification || mat.specification,
          supplier: data.supplier || mat.supplier,
          remark: data.remark || mat.remark,
          updatedAt: sql`now()`,
        })
        .where(eq(materials.id, mat.id))
        .returning({ id: materials.id });
      materialId = updated[0].id;
    }

    if (data.stock > 0) {
      await this.db.insert(purchaseRecords).values({
        materialId,
        purchaseDate: data.purchaseDate,
        price: String(data.unitPrice),
        supplier: data.supplier,
        quantity: data.stock,
      });
    }

    return { id: materialId, isNew, priceChange };
  }
}
