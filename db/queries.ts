import type { Apparatus, ApparatusDetail, Compartment, InventoryItem } from "@/lib/fire-data";

type ApparatusRow = Omit<Apparatus, "isReserve"> & { isReserve: number };

export async function listApparatus(db: D1Database) {
  const result = await db.prepare(`SELECT
      a.id,
      a.name,
      a.type,
      COALESCE(a.station_number, '') AS stationNumber,
      a.is_reserve AS isReserve,
      COALESCE(a.status, 'Active') AS status,
      COALESCE(a.notes, '') AS notes,
      COUNT(DISTINCT c.id) AS compartmentCount,
      COALESCE((SELECT SUM(quantity) FROM inventory_items i WHERE i.apparatus_id = a.id), 0) AS itemCount
    FROM apparatus a
    LEFT JOIN compartments c ON c.apparatus_id = a.id
    GROUP BY a.id
    ORDER BY CAST(a.station_number AS INTEGER), a.name`).all<ApparatusRow>();

  return result.results.map((row) => ({
    ...row,
    id: Number(row.id),
    isReserve: Boolean(row.isReserve),
    compartmentCount: Number(row.compartmentCount),
    itemCount: Number(row.itemCount),
  }));
}

export async function getApparatusDetail(db: D1Database, id: number): Promise<ApparatusDetail | null> {
  const apparatus = (await listApparatus(db)).find((entry) => entry.id === id);
  if (!apparatus) return null;

  const [compartmentRows, itemRows] = await Promise.all([
    db.prepare(`SELECT
        id,
        apparatus_id AS apparatusId,
        name,
        compartment_type AS compartmentType,
        sort_order AS sortOrder,
        COALESCE(notes, '') AS notes
      FROM compartments
      WHERE apparatus_id = ?
      ORDER BY sort_order, id`).bind(id).all<Compartment>(),
    db.prepare(`SELECT
        id,
        apparatus_id AS apparatusId,
        compartment_id AS compartmentId,
        name,
        COALESCE(equipment_type, 'Other') AS equipmentType,
        COALESCE(equipment_id, '') AS equipmentId,
        COALESCE(serial_number, '') AS serialNumber,
        COALESCE(quantity, 1) AS quantity,
        COALESCE(make, '') AS make,
        COALESCE(model, '') AS model,
        COALESCE(description, '') AS description,
        COALESCE(notes, '') AS notes,
        COALESCE(status, 'In Service') AS status,
        COALESCE(created_by, 'First Due import') AS createdBy
      FROM inventory_items
      WHERE apparatus_id = ?
      ORDER BY name, id`).bind(id).all<InventoryItem>(),
  ]);

  return {
    ...apparatus,
    compartments: compartmentRows.results.map((row) => ({
      ...row,
      id: Number(row.id),
      apparatusId: Number(row.apparatusId),
      sortOrder: Number(row.sortOrder),
    })),
    items: itemRows.results.map((row) => ({
      ...row,
      id: Number(row.id),
      apparatusId: Number(row.apparatusId),
      compartmentId: Number(row.compartmentId),
      quantity: Number(row.quantity),
      equipmentId: String(row.equipmentId ?? ""),
      serialNumber: String(row.serialNumber ?? ""),
    })),
  };
}

export function numberId(value: string) {
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}
