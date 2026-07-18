export type InventoryExportRow = {
  apparatusName: string;
  stationNumber: string;
  compartmentName: string;
  itemName: string;
  equipmentType: string;
  equipmentId: string;
  serialNumber: string;
  quantity: number;
  make: string;
  model: string;
  description: string;
  notes: string;
  status: string;
  createdBy: string;
};

const columns: Array<[string, keyof InventoryExportRow]> = [
  ["Apparatus Name", "apparatusName"],
  ["Station Number", "stationNumber"],
  ["Compartment Name", "compartmentName"],
  ["Item Name", "itemName"],
  ["Equipment Type", "equipmentType"],
  ["Equipment ID", "equipmentId"],
  ["Serial Number", "serialNumber"],
  ["Quantity", "quantity"],
  ["Make", "make"],
  ["Model", "model"],
  ["Description", "description"],
  ["Notes", "notes"],
  ["Status", "status"],
  ["Entered By", "createdBy"],
];

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function getInventoryExportRows(db: D1Database, apparatusId?: number) {
  const where = apparatusId ? "WHERE a.id = ?" : "";
  const statement = db.prepare(`SELECT
    a.name AS apparatusName,
    COALESCE(a.station_number, '') AS stationNumber,
    c.name AS compartmentName,
    i.name AS itemName,
    COALESCE(i.equipment_type, 'Other') AS equipmentType,
    COALESCE(i.equipment_id, '') AS equipmentId,
    COALESCE(i.serial_number, '') AS serialNumber,
    COALESCE(i.quantity, 1) AS quantity,
    COALESCE(i.make, '') AS make,
    COALESCE(i.model, '') AS model,
    COALESCE(i.description, '') AS description,
    COALESCE(i.notes, '') AS notes,
    COALESCE(i.status, 'In Service') AS status,
    COALESCE(i.created_by, 'First Due import') AS createdBy
  FROM inventory_items i
  JOIN apparatus a ON a.id = i.apparatus_id
  JOIN compartments c ON c.id = i.compartment_id
  ${where}
  ORDER BY CAST(a.station_number AS INTEGER), a.name, c.sort_order, i.name, i.id`);
  const result = apparatusId
    ? await statement.bind(apparatusId).all<InventoryExportRow>()
    : await statement.all<InventoryExportRow>();
  return result.results;
}

export function inventoryCsvResponse(rows: InventoryExportRow[], filename: string) {
  const lines = [
    columns.map(([label]) => escapeCsv(label)).join(","),
    ...rows.map((row) => columns.map(([, key]) => escapeCsv(row[key])).join(",")),
  ];
  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function csvFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "inventory";
}
