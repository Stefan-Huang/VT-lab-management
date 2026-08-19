/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { date, foreignKey, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const globalConfigs = pgTable("global_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: text("config_value"),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: 'string' }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`now()`),
}, (table) => [
  uniqueIndex("global_configs_config_key_key").on(table.configKey),
]);

export const researchPlans = pgTable("research_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  researchDirection: text("research_direction"),
  targets: text("targets").array().default([]),
  pathways: text("pathways").array().default([]),
  availableReagents: jsonb("available_reagents").default('[]'),
  estimatedSavings: numeric("estimated_savings").default('0'),
  createdAt: timestamp("created_at", { mode: 'string' }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`now()`),
});

export const protocols = pgTable("protocols", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description"),
  content: text("content").notNull(),
  attachments: jsonb("attachments").default('[]'),
  createdAt: timestamp("created_at", { mode: 'string' }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`now()`),
  nameEn: varchar("name_en", { length: 200 }),
  descriptionEn: text("description_en"),
  contentEn: text("content_en"),
  sourceLang: varchar("source_lang", { length: 10 }).default('zh'),
});

export const uploadRecords = pgTable("upload_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: varchar("filename", { length: 255 }).notNull(),
  uploadDate: timestamp("upload_date", { mode: 'string' }).default(sql`now()`),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  parsedCount: integer("parsed_count").default(0),
  successCount: integer("success_count").default(0),
  failedCount: integer("failed_count").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { mode: 'string' }).default(sql`now()`),
});

export const purchaseRecords = pgTable("purchase_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  materialId: uuid("material_id").notNull(),
  purchaseDate: date("purchase_date").notNull(),
  price: numeric("price").notNull(),
  supplier: varchar("supplier", { length: 200 }),
  quantity: integer("quantity").notNull(),
  batchNo: varchar("batch_no", { length: 100 }),
  createdAt: timestamp("created_at", { mode: 'string' }).default(sql`now()`),
}, (table) => [
  foreignKey({
    columns: [table.materialId],
    foreignColumns: [materials.id],
    name: "purchase_records_material_id_fkey",
  }).onDelete("cascade"),
]);

export const materials = pgTable("materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  catalogNo: varchar("catalog_no", { length: 100 }).notNull(),
  specification: varchar("specification", { length: 200 }),
  supplier: varchar("supplier", { length: 200 }),
  unitPrice: numeric("unit_price").notNull(),
  stock: integer("stock").notNull().default(0),
  purchaseDate: date("purchase_date"),
  remark: text("remark"),
  createdAt: timestamp("created_at", { mode: 'string' }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`now()`),
});

export const labUsers = pgTable("lab_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default('user'),
  createdAt: timestamp("created_at", { mode: 'string' }).default(sql`now()`),
  updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`now()`),
}, (table) => [
  uniqueIndex("lab_users_username_key").on(table.username),
]);

// table aliases
export const globalConfigsTable = globalConfigs;
export const labUsersTable = labUsers;
export const materialsTable = materials;
export const protocolsTable = protocols;
export const purchaseRecordsTable = purchaseRecords;
export const researchPlansTable = researchPlans;
export const uploadRecordsTable = uploadRecords;
