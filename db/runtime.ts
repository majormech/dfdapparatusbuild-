import { env } from "cloudflare:workers";
import { apparatusSeeds, inferCompartmentType, startingDetails, templateDefinitions } from "@/lib/fire-data";
import { csvImportedItems, csvInventoryImportBatchId, legacySampleEquipmentIds } from "@/lib/csv-inventory-import";

type DatabaseEnv = { DB?: D1Database };

let ready: Promise<D1Database> | null = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS apparatus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    station_number TEXT,
    is_reserve INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS compartments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apparatus_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    compartment_type TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apparatus_id) REFERENCES apparatus(id)
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apparatus_id INTEGER,
    compartment_id INTEGER,
    name TEXT NOT NULL,
    equipment_type TEXT,
    equipment_id TEXT,
    serial_number TEXT,
    quantity INTEGER DEFAULT 1,
    make TEXT,
    model TEXT,
    description TEXT,
    notes TEXT,
    status TEXT DEFAULT 'In Service',
    created_by TEXT NOT NULL DEFAULT 'First Due import',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (apparatus_id) REFERENCES apparatus(id),
    FOREIGN KEY (compartment_id) REFERENCES compartments(id)
  )`,
  `CREATE TABLE IF NOT EXISTS compartment_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    apparatus_type TEXT NOT NULL,
    name TEXT NOT NULL,
    compartment_type TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_import_batches (
    batch_id TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    item_count INTEGER NOT NULL,
    imported_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_import_rows (
    source_key TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    equipment_id TEXT NOT NULL,
    imported_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    actor TEXT NOT NULL,
    item_id INTEGER,
    item_name TEXT NOT NULL,
    apparatus_name TEXT NOT NULL,
    compartment_name TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS compartments_apparatus_idx ON compartments(apparatus_id, sort_order)",
  "CREATE INDEX IF NOT EXISTS items_apparatus_idx ON inventory_items(apparatus_id)",
  "CREATE INDEX IF NOT EXISTS items_compartment_idx ON inventory_items(compartment_id)",
  "CREATE INDEX IF NOT EXISTS inventory_import_rows_batch_idx ON inventory_import_rows(batch_id)",
  "CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor)",
  "CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC)",
];

async function seedDatabase(db: D1Database) {
  const templateCount = await db.prepare("SELECT COUNT(*) AS count FROM compartment_templates").first<{ count: number }>();
  if (!templateCount?.count) {
    const statements = Object.entries(templateDefinitions)
      .filter(([name]) => name !== "Blank/custom")
      .flatMap(([template, names]) => names.map((name, index) => db
        .prepare("INSERT INTO compartment_templates (apparatus_type, name, compartment_type, sort_order) VALUES (?, ?, ?, ?)")
        .bind(template, name, inferCompartmentType(name), index + 1)));
    if (statements.length) await db.batch(statements);
  }

  const apparatusCount = await db.prepare("SELECT COUNT(*) AS count FROM apparatus").first<{ count: number }>();
  if (!apparatusCount?.count) {
    for (const seed of apparatusSeeds) {
      const inserted = await db
        .prepare("INSERT INTO apparatus (name, type, station_number, is_reserve, status, notes) VALUES (?, ?, ?, ?, 'Active', ?)")
        .bind(seed.name, seed.type, seed.stationNumber, seed.isReserve ? 1 : 0, seed.isReserve ? "Reserve apparatus" : "")
        .run();
      const apparatusId = Number(inserted.meta.last_row_id);
      const detail = startingDetails.find((entry) => entry.name === seed.name);
      if (!detail) continue;

      for (const compartment of detail.compartments) {
        await db
          .prepare("INSERT INTO compartments (apparatus_id, name, compartment_type, sort_order, notes) VALUES (?, ?, ?, ?, ?)")
          .bind(apparatusId, compartment.name, compartment.compartmentType, compartment.sortOrder, compartment.notes)
          .run();
      }
    }
  }
}

async function ensureRuntimeColumns(db: D1Database) {
  const columns = await db.prepare("PRAGMA table_info(inventory_items)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "created_by")) {
    await db.prepare("ALTER TABLE inventory_items ADD COLUMN created_by TEXT NOT NULL DEFAULT 'First Due import'").run();
  }
}

async function batchInChunks(db: D1Database, statements: D1PreparedStatement[], size = 80) {
  for (let index = 0; index < statements.length; index += size) {
    await db.batch(statements.slice(index, index + size));
  }
}

function compartmentKey(apparatusId: number, name: string) {
  return `${apparatusId}\u0000${name.trim().toLowerCase()}`;
}

async function ensureImportLocations(db: D1Database) {
  const existingApparatus = await db.prepare("SELECT id, name FROM apparatus").all<{ id: number; name: string }>();
  const existingNames = new Set(existingApparatus.results.map((entry) => entry.name));
  const missingApparatus = apparatusSeeds.filter((seed) => !existingNames.has(seed.name));

  await batchInChunks(db, missingApparatus.map((seed) => db
    .prepare("INSERT OR IGNORE INTO apparatus (name, type, station_number, is_reserve, status, notes) VALUES (?, ?, ?, ?, 'Active', ?)")
    .bind(seed.name, seed.type, seed.stationNumber, seed.isReserve ? 1 : 0, seed.isReserve ? "Reserve apparatus" : "")));

  const apparatusRows = await db.prepare("SELECT id, name FROM apparatus").all<{ id: number; name: string }>();
  const apparatusIds = new Map(apparatusRows.results.map((entry) => [entry.name, Number(entry.id)]));
  const existingCompartments = await db.prepare("SELECT id, apparatus_id AS apparatusId, name FROM compartments").all<{ id: number; apparatusId: number; name: string }>();
  const compartmentIds = new Map(existingCompartments.results.map((entry) => [compartmentKey(Number(entry.apparatusId), entry.name), Number(entry.id)]));
  const missingStatements: D1PreparedStatement[] = [];
  const newlyCreatedNames = new Set(missingApparatus.map((seed) => seed.name));

  for (const seed of apparatusSeeds) {
    const apparatusId = apparatusIds.get(seed.name);
    const detail = startingDetails.find((entry) => entry.name === seed.name);
    if (!apparatusId || !detail) continue;
    const importedCompartmentNames = new Set(
      csvImportedItems.filter((item) => item.apparatusName === seed.name).map((item) => item.compartmentName),
    );
    const desiredCompartments = newlyCreatedNames.has(seed.name)
      ? detail.compartments
      : detail.compartments.filter((compartment) => importedCompartmentNames.has(compartment.name));

    for (const compartment of desiredCompartments) {
      if (compartmentIds.has(compartmentKey(apparatusId, compartment.name))) continue;
      missingStatements.push(db
        .prepare("INSERT INTO compartments (apparatus_id, name, compartment_type, sort_order, notes) VALUES (?, ?, ?, ?, ?)")
        .bind(apparatusId, compartment.name, compartment.compartmentType, compartment.sortOrder, compartment.notes));
    }
  }

  await batchInChunks(db, missingStatements);

  const finalCompartments = await db.prepare("SELECT id, apparatus_id AS apparatusId, name FROM compartments").all<{ id: number; apparatusId: number; name: string }>();
  return {
    apparatusIds,
    compartmentIds: new Map(finalCompartments.results.map((entry) => [compartmentKey(Number(entry.apparatusId), entry.name), Number(entry.id)])),
  };
}

async function applyInventoryImport(db: D1Database) {
  const completed = await db
    .prepare("SELECT batch_id AS batchId FROM inventory_import_batches WHERE batch_id = ?")
    .bind(csvInventoryImportBatchId)
    .first<{ batchId: string }>();
  if (completed) return;

  const samplePlaceholders = legacySampleEquipmentIds.map(() => "?").join(", ");
  await db.prepare(`DELETE FROM inventory_items WHERE equipment_id IN (${samplePlaceholders})`)
    .bind(...legacySampleEquipmentIds)
    .run();

  const { apparatusIds, compartmentIds } = await ensureImportLocations(db);
  const importedRows = await db
    .prepare("SELECT source_key AS sourceKey FROM inventory_import_rows WHERE batch_id = ?")
    .bind(csvInventoryImportBatchId)
    .all<{ sourceKey: string }>();
  const importedKeys = new Set(importedRows.results.map((entry) => entry.sourceKey));
  const existingItems = await db
    .prepare("SELECT id, equipment_id AS equipmentId FROM inventory_items WHERE equipment_id IS NOT NULL AND equipment_id <> ''")
    .all<{ id: number; equipmentId: string }>();
  const existingByEquipmentId = new Map(existingItems.results.map((entry) => [String(entry.equipmentId), Number(entry.id)]));
  const statements: D1PreparedStatement[] = [];

  for (const item of csvImportedItems) {
    if (importedKeys.has(item.sourceKey)) continue;
    const apparatusId = apparatusIds.get(item.apparatusName);
    const compartmentId = apparatusId ? compartmentIds.get(compartmentKey(apparatusId, item.compartmentName)) : undefined;
    if (!apparatusId || !compartmentId) {
      throw new Error(`Unable to map ${item.equipmentId} to ${item.apparatusName} / ${item.compartmentName}.`);
    }

    const existingId = existingByEquipmentId.get(item.equipmentId);
    if (existingId) {
      statements.push(db.prepare(`UPDATE inventory_items SET
        apparatus_id = ?, compartment_id = ?, name = ?, equipment_type = ?, equipment_id = ?, serial_number = ?,
        quantity = ?, make = ?, model = ?, description = ?, notes = ?, status = ?, created_by = 'First Due import', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND NOT EXISTS (SELECT 1 FROM inventory_import_rows WHERE source_key = ?)`)
        .bind(apparatusId, compartmentId, item.name, item.equipmentType, String(item.equipmentId), String(item.serialNumber), item.quantity, item.make, item.model, item.description.slice(0, 250), item.notes.slice(0, 250), item.status, existingId, item.sourceKey));
    } else {
      statements.push(db.prepare(`INSERT INTO inventory_items (
        apparatus_id, compartment_id, name, equipment_type, equipment_id, serial_number,
        quantity, make, model, description, notes, status, created_by
      ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'First Due import'
      WHERE NOT EXISTS (SELECT 1 FROM inventory_import_rows WHERE source_key = ?)`)
        .bind(apparatusId, compartmentId, item.name, item.equipmentType, String(item.equipmentId), String(item.serialNumber), item.quantity, item.make, item.model, item.description.slice(0, 250), item.notes.slice(0, 250), item.status, item.sourceKey));
    }
    statements.push(db
      .prepare("INSERT OR IGNORE INTO inventory_import_rows (source_key, batch_id, equipment_id) VALUES (?, ?, ?)")
      .bind(item.sourceKey, csvInventoryImportBatchId, String(item.equipmentId)));
  }

  await batchInChunks(db, statements);
  await db.prepare("INSERT OR IGNORE INTO inventory_import_batches (batch_id, source_name, item_count) VALUES (?, ?, ?)")
    .bind(csvInventoryImportBatchId, "Five unique First Due CSV exports supplied 2026-07-17", csvImportedItems.length)
    .run();
}

const inventoryCorrectionBatchId = "inventory-correction-2026-07-17-e1-spreader-rear-center";

async function applyInventoryCorrections(db: D1Database) {
  const completed = await db
    .prepare("SELECT batch_id AS batchId FROM inventory_import_batches WHERE batch_id = ?")
    .bind(inventoryCorrectionBatchId)
    .first<{ batchId: string }>();
  if (completed) return;

  const engine = await db.prepare("SELECT id FROM apparatus WHERE name = 'Engine 1'").first<{ id: number }>();
  if (!engine) throw new Error("Engine 1 is unavailable for the PSP40 correction.");
  const rearCenter = await db
    .prepare("SELECT id FROM compartments WHERE apparatus_id = ? AND LOWER(name) = LOWER('Rear Center')")
    .bind(engine.id)
    .first<{ id: number }>();
  if (!rearCenter) throw new Error("Engine 1 Rear Center is unavailable for the PSP40 correction.");

  const moved = await db
    .prepare("UPDATE inventory_items SET apparatus_id = ?, compartment_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE equipment_id = 'E1-SPREADERS'")
    .bind(
      engine.id,
      rearCenter.id,
      "Source location: Engine 1 - Rear Center · Next service: 07/10/2027 · Last service: 07/10/2026 · Next test: 07/10/2027 · Last test: 07/10/2026",
    )
    .run();
  if (!moved.meta.changes) throw new Error("The PSP40 inventory record is unavailable for correction.");

  const unassigned = await db.prepare("SELECT id FROM apparatus WHERE name = 'Unassigned Equipment'").first<{ id: number }>();
  if (unassigned) {
    const remaining = await db
      .prepare("SELECT COUNT(*) AS count FROM inventory_items WHERE apparatus_id = ?")
      .bind(unassigned.id)
      .first<{ count: number }>();
    if (!remaining?.count) {
      await db.batch([
        db.prepare("DELETE FROM compartments WHERE apparatus_id = ?").bind(unassigned.id),
        db.prepare("DELETE FROM apparatus WHERE id = ?").bind(unassigned.id),
      ]);
    }
  }

  await db.prepare("INSERT OR IGNORE INTO inventory_import_batches (batch_id, source_name, item_count) VALUES (?, ?, 1)")
    .bind(inventoryCorrectionBatchId, "Move PSP40 spreader to Engine 1 Rear Center")
    .run();
}

const removeEngine8BatchId = "apparatus-correction-2026-07-17-remove-engine-8";

async function removeEngine8(db: D1Database) {
  const completed = await db
    .prepare("SELECT batch_id AS batchId FROM inventory_import_batches WHERE batch_id = ?")
    .bind(removeEngine8BatchId)
    .first<{ batchId: string }>();
  if (completed) return;

  const engine = await db.prepare("SELECT id FROM apparatus WHERE name = 'Engine 8'").first<{ id: number }>();
  if (engine) {
    await db.batch([
      db.prepare("DELETE FROM inventory_items WHERE apparatus_id = ?").bind(engine.id),
      db.prepare("DELETE FROM compartments WHERE apparatus_id = ?").bind(engine.id),
      db.prepare("DELETE FROM apparatus WHERE id = ?").bind(engine.id),
    ]);
  }

  await db.prepare("INSERT OR IGNORE INTO inventory_import_batches (batch_id, source_name, item_count) VALUES (?, ?, 1)")
    .bind(removeEngine8BatchId, "Remove Engine 8 and its inventory")
    .run();
}

const removeRadiosBatchId = "inventory-correction-2026-07-17-remove-all-radios";

async function removeAllRadios(db: D1Database) {
  const completed = await db
    .prepare("SELECT batch_id AS batchId FROM inventory_import_batches WHERE batch_id = ?")
    .bind(removeRadiosBatchId)
    .first<{ batchId: string }>();
  if (completed) return;

  const affected = await db.prepare(`SELECT DISTINCT a.id, a.name
    FROM apparatus a
    JOIN inventory_items i ON i.apparatus_id = a.id
    WHERE LOWER(i.name) LIKE '%radio%'`).all<{ id: number; name: string }>();
  const removed = await db.prepare("DELETE FROM inventory_items WHERE LOWER(name) LIKE '%radio%'").run();
  const retainedNames = new Set(apparatusSeeds.map((apparatus) => apparatus.name));

  for (const apparatus of affected.results) {
    if (retainedNames.has(apparatus.name)) continue;
    const remaining = await db
      .prepare("SELECT COUNT(*) AS count FROM inventory_items WHERE apparatus_id = ?")
      .bind(apparatus.id)
      .first<{ count: number }>();
    if (!remaining?.count) {
      await db.batch([
        db.prepare("DELETE FROM compartments WHERE apparatus_id = ?").bind(apparatus.id),
        db.prepare("DELETE FROM apparatus WHERE id = ?").bind(apparatus.id),
      ]);
    }
  }

  await db.prepare(`DELETE FROM compartments
    WHERE LOWER(name) LIKE '%radio%'
      AND NOT EXISTS (SELECT 1 FROM inventory_items WHERE compartment_id = compartments.id)`).run();

  const removedCount = Number(removed.meta.changes ?? 0);
  if (removedCount) {
    await db.prepare(`INSERT INTO audit_logs (
      action, actor, item_id, item_name, apparatus_name, compartment_name, details
    ) VALUES ('Bulk inventory removal', 'System', NULL, 'All radios', 'All apparatus', 'All compartments', ?)`)
      .bind(`${removedCount} radio inventory records removed.`)
      .run();
  }

  await db.prepare("INSERT OR IGNORE INTO inventory_import_batches (batch_id, source_name, item_count) VALUES (?, ?, ?)")
    .bind(removeRadiosBatchId, "Remove all radio inventory", removedCount)
    .run();
}

async function enforceInventoryTextLimits(db: D1Database) {
  await db.batch([
    db.prepare("UPDATE inventory_items SET description = substr(description, 1, 250), updated_at = CURRENT_TIMESTAMP WHERE length(description) > 250"),
    db.prepare("UPDATE inventory_items SET notes = substr(notes, 1, 250), updated_at = CURRENT_TIMESTAMP WHERE length(notes) > 250"),
  ]);
}

export function getDatabase() {
  if (!ready) {
    ready = (async () => {
      const db = (env as DatabaseEnv).DB;
      if (!db) throw new Error("The D1 database binding is unavailable.");
      await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
      await ensureRuntimeColumns(db);
      await seedDatabase(db);
      await applyInventoryImport(db);
      await applyInventoryCorrections(db);
      await removeEngine8(db);
      await removeAllRadios(db);
      await enforceInventoryTextLimits(db);
      return db;
    })();
  }
  return ready;
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected database error";
  return Response.json({ error: message }, { status: 500 });
}
