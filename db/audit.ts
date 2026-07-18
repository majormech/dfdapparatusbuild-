export type AuditEntry = {
  action: string;
  actor: string;
  itemId?: number | null;
  itemName: string;
  apparatusName: string;
  compartmentName: string;
  details?: string;
};

export async function writeAuditLog(db: D1Database, entry: AuditEntry) {
  await db.prepare(`INSERT INTO audit_logs (
    action, actor, item_id, item_name, apparatus_name, compartment_name, details
  ) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      entry.action,
      entry.actor,
      entry.itemId ?? null,
      entry.itemName,
      entry.apparatusName,
      entry.compartmentName,
      entry.details ?? "",
    )
    .run();
}

export async function getItemAuditContext(db: D1Database, itemId: number) {
  return db.prepare(`SELECT
    i.id,
    i.name AS itemName,
    COALESCE(i.created_by, 'First Due import') AS createdBy,
    a.name AS apparatusName,
    c.name AS compartmentName
  FROM inventory_items i
  JOIN apparatus a ON a.id = i.apparatus_id
  JOIN compartments c ON c.id = i.compartment_id
  WHERE i.id = ?`).bind(itemId).first<{
    id: number;
    itemName: string;
    createdBy: string;
    apparatusName: string;
    compartmentName: string;
  }>();
}

export async function getLocationNames(db: D1Database, apparatusId: number, compartmentId: number) {
  return db.prepare(`SELECT a.name AS apparatusName, c.name AS compartmentName
    FROM apparatus a
    JOIN compartments c ON c.apparatus_id = a.id
    WHERE a.id = ? AND c.id = ?`)
    .bind(apparatusId, compartmentId)
    .first<{ apparatusName: string; compartmentName: string }>();
}
