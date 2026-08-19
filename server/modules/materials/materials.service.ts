import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, like, and, desc, asc, sql, count, gte, lt } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { materials, purchaseRecords } from '@server/database/schema';
import type {
  Material,
  MaterialCategory,
  MaterialStatistics,
  PriceHistoryResponse,
  PriceHistoryItem,
} from '@shared/types';

const LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getList(params: {
    page: number;
    pageSize: number;
    category?: string;
    keyword?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: Material[]; total: number; page: number; pageSize: number }> {
    const { page = 1, pageSize = 20, category, keyword, sortBy, sortOrder = 'desc' } = params;
    const offset = (page - 1) * pageSize;

    const whereConditions = [];
    if (category && category !== 'all') {
      whereConditions.push(eq(materials.category, category));
    }
    if (keyword) {
      whereConditions.push(
        sql`(${materials.name} ILIKE ${'%' + keyword + '%'} OR ${materials.catalogNo} ILIKE ${'%' + keyword + '%'} OR ${materials.supplier} ILIKE ${'%' + keyword + '%'})`,
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    let orderClause;
    if (sortBy === 'price') {
      orderClause = sortOrder === 'asc' ? asc(materials.unitPrice) : desc(materials.unitPrice);
    } else if (sortBy === 'purchaseDate') {
      orderClause = sortOrder === 'asc' ? asc(materials.purchaseDate) : desc(materials.purchaseDate);
    } else if (sortBy === 'stock') {
      orderClause = sortOrder === 'asc' ? asc(materials.stock) : desc(materials.stock);
    } else if (sortBy === 'name') {
      orderClause = sortOrder === 'asc' ? asc(materials.name) : desc(materials.name);
    } else {
      orderClause = desc(materials.updatedAt);
    }

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(materials)
        .where(whereClause)
        .orderBy(orderClause)
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(materials)
        .where(whereClause),
    ]);

    return {
      items: items.map((m) => this.mapMaterial(m)),
      total: Number(countResult[0]?.count || 0),
      page,
      pageSize,
    };
  }

  async getById(id: string): Promise<Material> {
    const items = await this.db
      .select()
      .from(materials)
      .where(eq(materials.id, id))
      .limit(1);

    if (items.length === 0) {
      throw new NotFoundException('物资不存在');
    }

    return this.mapMaterial(items[0]);
  }

  async create(data: {
    name: string;
    category: MaterialCategory;
    catalogNo: string;
    specification: string;
    supplier: string;
    unitPrice: number;
    stock: number;
    purchaseDate: string;
    remark: string;
  }): Promise<Material> {
    if (!data.name || !data.category || !data.catalogNo) {
      throw new BadRequestException('名称、类别、货号不能为空');
    }

    const existing = await this.db
      .select()
      .from(materials)
      .where(eq(materials.catalogNo, data.catalogNo))
      .limit(1);

    if (existing.length > 0) {
      throw new BadRequestException('该货号已存在');
    }

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
      .returning();

    const material = this.mapMaterial(inserted[0]);

    if (data.stock > 0) {
      await this.db.insert(purchaseRecords).values({
        materialId: material.id,
        purchaseDate: data.purchaseDate,
        price: String(data.unitPrice),
        supplier: data.supplier,
        quantity: data.stock,
      });
    }

    return material;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      category: MaterialCategory;
      catalogNo: string;
      specification: string;
      supplier: string;
      unitPrice: number;
      stock: number;
      purchaseDate: string;
      remark: string;
    }>,
  ): Promise<Material> {
    const existing = await this.db
      .select()
      .from(materials)
      .where(eq(materials.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException('物资不存在');
    }

    const patch: Partial<typeof materials.$inferInsert> = {};

    if (data.name !== undefined) patch.name = data.name;
    if (data.category !== undefined) patch.category = data.category;
    if (data.catalogNo !== undefined) patch.catalogNo = data.catalogNo;
    if (data.specification !== undefined) patch.specification = data.specification;
    if (data.supplier !== undefined) patch.supplier = data.supplier;
    if (data.unitPrice !== undefined) patch.unitPrice = String(data.unitPrice);
    if (data.stock !== undefined) patch.stock = data.stock;
    if (data.purchaseDate !== undefined) patch.purchaseDate = data.purchaseDate;
    if (data.remark !== undefined) patch.remark = data.remark;

    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    const updated = await this.db
      .update(materials)
      .set(patch)
      .where(eq(materials.id, id))
      .returning();

    return this.mapMaterial(updated[0]);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const deleted = await this.db
      .delete(materials)
      .where(eq(materials.id, id))
      .returning({ id: materials.id });

    if (deleted.length === 0) {
      throw new NotFoundException('物资不存在');
    }

    return { success: true };
  }

  async getStatistics(): Promise<MaterialStatistics> {
    const [totalResult, lowStockResult, categoryResult] = await Promise.all([
      this.db.select({ count: count() }).from(materials),
      this.db
        .select({ count: count() })
        .from(materials)
        .where(sql`${materials.stock} <= ${LOW_STOCK_THRESHOLD}`),
      this.db
        .select({
          category: materials.category,
          count: count(),
        })
        .from(materials)
        .groupBy(materials.category),
    ]);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthStr = nextMonthStart.toISOString().split('T')[0];

    const monthlyResult = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${purchaseRecords.price} * ${purchaseRecords.quantity}), 0)`,
      })
      .from(purchaseRecords)
      .where(
        and(
          gte(purchaseRecords.purchaseDate, monthStartStr),
          lt(purchaseRecords.purchaseDate, nextMonthStr),
        ),
      );

    return {
      totalCount: Number(totalResult[0]?.count || 0),
      categoryDistribution: categoryResult.map((c) => ({
        category: c.category as MaterialCategory,
        count: Number(c.count),
      })),
      lowStockCount: Number(lowStockResult[0]?.count || 0),
      monthlyPurchaseAmount: String(monthlyResult[0]?.total || 0),
    };
  }

  async getPriceHistory(materialId: string): Promise<PriceHistoryResponse> {
    const material = await this.getById(materialId);

    const records = await this.db
      .select()
      .from(purchaseRecords)
      .where(eq(purchaseRecords.materialId, materialId))
      .orderBy(asc(purchaseRecords.purchaseDate));

    if (records.length === 0) {
      return {
        history: [],
        avgPrice: '0',
        maxPrice: '0',
        minPrice: '0',
        fluctuation: 0,
        latestChangePercent: null,
      };
    }

    const prices = records.map((r) => Number(r.price));
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const fluctuation = maxPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

    const history: PriceHistoryItem[] = records.map((r, index) => {
      const currentPrice = Number(r.price);
      let changePercent: number | null = null;
      if (index > 0) {
        const prevPrice = Number(records[index - 1].price);
        if (prevPrice > 0) {
          changePercent = ((currentPrice - prevPrice) / prevPrice) * 100;
        }
      }
      return {
        id: r.id,
        date: r.purchaseDate.toString(),
        price: r.price as string,
        supplier: r.supplier || '',
        stockAdded: r.quantity,
        changePercent: changePercent !== null ? Number(changePercent.toFixed(2)) : null,
      };
    });

    const latestChangePercent =
      history.length >= 2 ? history[history.length - 1].changePercent : null;

    return {
      history,
      avgPrice: avgPrice.toFixed(2),
      maxPrice: maxPrice.toFixed(2),
      minPrice: minPrice.toFixed(2),
      fluctuation: Number(fluctuation.toFixed(2)),
      latestChangePercent,
    };
  }

  private mapMaterial(m: typeof materials.$inferSelect): Material {
    return {
      id: m.id,
      name: m.name,
      category: m.category as MaterialCategory,
      catalogNo: m.catalogNo,
      specification: m.specification || '',
      supplier: m.supplier || '',
      unitPrice: String(m.unitPrice),
      stock: m.stock,
      purchaseDate: m.purchaseDate ? m.purchaseDate.toString() : '',
      remark: m.remark || '',
      createdAt: m.createdAt || '',
      updatedAt: m.updatedAt || '',
    };
  }
}
