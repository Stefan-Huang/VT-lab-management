import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, or, ilike, count, desc } from 'drizzle-orm';
import { protocols } from '@server/database/schema';
import type { Protocol, ProtocolAttachment, ExpType, ProtocolListResponse } from '@shared/types';

interface ProtocolListParams {
  expType?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

interface CreateProtocolDto {
  name: string;
  nameEn?: string;
  type: ExpType;
  description?: string;
  descriptionEn?: string;
  content: string;
  contentEn?: string;
  sourceLang?: 'zh' | 'en';
  attachments?: ProtocolAttachment[];
}

interface UpdateProtocolDto {
  name?: string;
  nameEn?: string;
  type?: ExpType;
  description?: string;
  descriptionEn?: string;
  content?: string;
  contentEn?: string;
  sourceLang?: 'zh' | 'en';
  attachments?: ProtocolAttachment[];
}

function rowToProtocol(row: typeof protocols.$inferSelect): Protocol {
  const attachmentsRaw = row.attachments as unknown;
  let atts: ProtocolAttachment[] = [];
  if (Array.isArray(attachmentsRaw)) {
    atts = attachmentsRaw.map((a: Record<string, unknown>) => ({
      bucketId: String(a.bucketId ?? a.bucket_id ?? ''),
      filePath: String(a.filePath ?? a.file_path ?? ''),
      fileName: String(a.fileName ?? a.file_name ?? ''),
      fileType: String(a.fileType ?? a.file_type ?? ''),
    }));
  }
  const rowAny = row as typeof protocols.$inferSelect & {
    name_en?: string | null;
    description_en?: string | null;
    content_en?: string | null;
    source_lang?: string | null;
  };
  const sourceLang = (rowAny.source_lang === 'en' ? 'en' : 'zh') as 'zh' | 'en';
  return {
    id: row.id,
    name: row.name,
    nameEn: rowAny.name_en ?? '',
    type: row.type as ExpType,
    description: row.description ?? '',
    descriptionEn: rowAny.description_en ?? '',
    content: row.content,
    contentEn: rowAny.content_en ?? '',
    sourceLang,
    attachments: atts,
    createdAt: row.createdAt ?? '',
    updatedAt: row.updatedAt ?? '',
  };
}

@Injectable()
export class ProtocolsService {
  constructor(@Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase) {}

  async getList(params: ProtocolListParams): Promise<ProtocolListResponse> {
    const page = params.page ? Math.max(1, Number(params.page)) : 1;
    const pageSize = params.pageSize ? Math.max(1, Math.min(100, Number(params.pageSize))) : 12;
    const offset = (page - 1) * pageSize;

    const whereClauses = [];
    if (params.expType && params.expType !== 'all') {
      whereClauses.push(eq(protocols.type, params.expType));
    }
    if (params.keyword) {
      const kw = `%${params.keyword}%`;
      whereClauses.push(or(ilike(protocols.name, kw), ilike(protocols.description, kw)));
    }
    const whereExpr = whereClauses.length > 0 ? and(...whereClauses) : undefined;

    const rows = await this.db
      .select()
      .from(protocols)
      .where(whereExpr)
      .orderBy(desc(protocols.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ count: count() })
      .from(protocols)
      .where(whereExpr);

    const total = Number(countResult[0]?.count ?? 0);

    return {
      items: rows.map((row: typeof protocols.$inferSelect) => rowToProtocol(row)),
      total,
    };
  }

  async getById(id: string): Promise<Protocol> {
    const rows = await this.db.select().from(protocols).where(eq(protocols.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException('Protocol 不存在');
    }
    return rowToProtocol(rows[0]);
  }

  async create(dto: CreateProtocolDto): Promise<{ id: string; success: boolean }> {
    if (!dto.name?.trim()) {
      throw new BadRequestException('名称不能为空');
    }
    if (!dto.type) {
      throw new BadRequestException('实验类型不能为空');
    }
    if (!dto.content?.trim()) {
      throw new BadRequestException('内容不能为空');
    }

    const [row] = await this.db
      .insert(protocols)
      .values({
        name: dto.name.trim(),
        type: dto.type,
        description: dto.description ?? '',
        content: dto.content,
        attachments: (dto.attachments ?? []) as unknown as Record<string, unknown>[],
        nameEn: dto.nameEn ?? '',
        descriptionEn: dto.descriptionEn ?? '',
        contentEn: dto.contentEn ?? '',
        sourceLang: dto.sourceLang ?? 'zh',
      })
      .returning({ id: protocols.id });

    return { id: row.id, success: true };
  }

  async update(id: string, dto: UpdateProtocolDto): Promise<{ success: boolean }> {
    const patch: Partial<typeof protocols.$inferInsert> & Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.description !== undefined) patch.description = dto.description;
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.nameEn !== undefined) patch.nameEn = dto.nameEn;
    if (dto.descriptionEn !== undefined) patch.descriptionEn = dto.descriptionEn;
    if (dto.contentEn !== undefined) patch.contentEn = dto.contentEn;
    if (dto.sourceLang !== undefined) patch.sourceLang = dto.sourceLang;
    if (dto.attachments !== undefined) {
      patch.attachments = dto.attachments as unknown as Record<string, unknown>[];
    }
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated = await this.db
      .update(protocols)
      .set(patch)
      .where(eq(protocols.id, id))
      .returning({ id: protocols.id });

    if (updated.length === 0) {
      throw new NotFoundException('Protocol 不存在');
    }

    return { success: true };
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const deleted = await this.db
      .delete(protocols)
      .where(eq(protocols.id, id))
      .returning({ id: protocols.id });

    if (deleted.length === 0) {
      throw new NotFoundException('Protocol 不存在');
    }

    return { success: true };
  }
}
