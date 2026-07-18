import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const apparatus = sqliteTable("apparatus", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  stationNumber: text("station_number"),
  isReserve: integer("is_reserve").notNull().default(0),
  status: text("status").notNull().default("Active"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const compartments = sqliteTable("compartments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apparatusId: integer("apparatus_id").notNull().references(() => apparatus.id),
  name: text("name").notNull(),
  compartmentType: text("compartment_type").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apparatusId: integer("apparatus_id").references(() => apparatus.id),
  compartmentId: integer("compartment_id").references(() => compartments.id),
  name: text("name").notNull(),
  equipmentType: text("equipment_type"),
  equipmentId: text("equipment_id"),
  serialNumber: text("serial_number"),
  quantity: integer("quantity").notNull().default(1),
  make: text("make"),
  model: text("model"),
  description: text("description"),
  notes: text("notes"),
  status: text("status").notNull().default("In Service"),
  createdBy: text("created_by").notNull().default("First Due import"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const compartmentTemplates = sqliteTable("compartment_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  apparatusType: text("apparatus_type").notNull(),
  name: text("name").notNull(),
  compartmentType: text("compartment_type").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const inventoryImportBatches = sqliteTable("inventory_import_batches", {
  batchId: text("batch_id").primaryKey(),
  sourceName: text("source_name").notNull(),
  itemCount: integer("item_count").notNull(),
  importedAt: text("imported_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const inventoryImportRows = sqliteTable("inventory_import_rows", {
  sourceKey: text("source_key").primaryKey(),
  batchId: text("batch_id").notNull(),
  equipmentId: text("equipment_id").notNull(),
  importedAt: text("imported_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  itemId: integer("item_id"),
  itemName: text("item_name").notNull(),
  apparatusName: text("apparatus_name").notNull(),
  compartmentName: text("compartment_name").notNull(),
  details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
