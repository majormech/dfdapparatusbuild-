import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the production build includes the DFD inventory dashboard", async () => {
  const [layout, dashboard, data] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("components/apparatus-views.tsx", root), "utf8"),
    readFile(new URL("lib/fire-data.ts", root), "utf8"),
  ]);

  assert.match(layout, /DFD Apparatus Inventory/);
  assert.match(layout, /og\.png/);
  assert.match(dashboard, /Shift-ready inventory/);
  assert.match(data, /Engine 1/);
  assert.match(data, /Truck 1/);
  assert.doesNotMatch(`${layout}${dashboard}`, /codex-preview|react-loading-skeleton/i);
  await access(new URL("dist/server/index.js", root));
  await access(new URL("public/og.png", root));
});

test("each apparatus has a dedicated detail route and inventory controls", async () => {
  const [route, detail, api] = await Promise.all([
    readFile(new URL("app/apparatus/[slug]/page.tsx", root), "utf8"),
    readFile(new URL("components/apparatus-detail.tsx", root), "utf8"),
    readFile(new URL("app/api/items/[id]/move/route.ts", root), "utf8"),
  ]);

  assert.match(route, /ApparatusDetailView/);
  assert.match(detail, /Compartment index/);
  assert.match(detail, /Add inventory item/);
  assert.match(detail, /Move inventory item/);
  assert.match(detail, /Download CSV/);
  assert.match(detail, /Delete apparatus/);
  assert.match(api, /UPDATE inventory_items/);
});

test("the dashboard is organized by station with editable apparatus cards", async () => {
  const [dashboard, stationRoute, shell, runtime] = await Promise.all([
    readFile(new URL("components/apparatus-views.tsx", root), "utf8"),
    readFile(new URL("app/stations/[station]/page.tsx", root), "utf8"),
    readFile(new URL("components/app-shell.tsx", root), "utf8"),
    readFile(new URL("db/runtime.ts", root), "utf8"),
  ]);

  assert.match(dashboard, /StationCard/);
  assert.match(dashboard, /StationDetailView/);
  assert.match(dashboard, /Edit apparatus/);
  assert.match(stationRoute, /StationDetailView/);
  assert.doesNotMatch(dashboard, /Fleet readiness|92%|item needs attention/);
  assert.doesNotMatch(shell, /A SHIFT/);
  assert.match(runtime, /apparatus-correction-2026-07-17-remove-engine-8/);
  assert.doesNotMatch(dashboard, /Engine 8/);
});

test("the supplied First Due exports are deduplicated and mapped to their listed locations", async () => {
  const [source, runtime] = await Promise.all([
    readFile(new URL("lib/csv-inventory-import.ts", root), "utf8"),
    readFile(new URL("db/runtime.ts", root), "utf8"),
  ]);
  const match = source.match(/export const csvImportedItems: CsvImportedInventoryItem\[\] = (\[[\s\S]*\]);\s*$/);
  assert.ok(match, "generated CSV inventory array was not found");
  const items = JSON.parse(match[1]);
  const equipmentIds = new Set(items.map((item) => item.equipmentId));

  assert.equal(items.length, 272);
  assert.equal(equipmentIds.size, 272);
  assert.equal(items.filter((item) => item.apparatusName === "Engine 8").length, 0);
  assert.equal(items.filter((item) => /radio/i.test(item.name)).length, 0);
  assert.equal(items.filter((item) => item.apparatusName === "Station 1 Storage").length, 154);
  assert.equal(items.filter((item) => item.apparatusName === "Engine 1").length, 13);
  assert.equal(items.find((item) => item.equipmentId === "55321029")?.compartmentName, "EMS Cabinet");
  assert.equal(items.find((item) => item.equipmentId === "E1-SPREADERS")?.apparatusName, "Engine 1");
  assert.equal(items.find((item) => item.equipmentId === "E1-SPREADERS")?.compartmentName, "Rear Center");
  assert.match(runtime, /inventory_import_batches/);
  assert.match(runtime, /inventory_import_rows/);
  assert.match(runtime, /INSERT OR IGNORE INTO inventory_import_rows/);
  assert.match(runtime, /inventory-correction-2026-07-17-e1-spreader-rear-center/);
  assert.match(runtime, /inventory-correction-2026-07-17-remove-all-radios/);
});

test("inventory entry enforces required fields, text limits, and barcode scanning", async () => {
  const [detail, createApi, updateApi, schema] = await Promise.all([
    readFile(new URL("components/apparatus-detail.tsx", root), "utf8"),
    readFile(new URL("app/api/items/route.ts", root), "utf8"),
    readFile(new URL("app/api/items/[id]/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
  ]);

  assert.match(detail, /Name or department ID/);
  assert.match(detail, /Item Name, Quantity, and Assigned Compartment/);
  assert.match(detail, /Example: Halligan Bar/);
  assert.match(detail, /Do not add hoses\. All hose inventory has already been entered\./);
  assert.match(detail, /BarcodeDetector/);
  assert.match(detail, /getUserMedia/);
  assert.match(detail, /placeholder="If applicable"/);
  assert.equal((detail.match(/maxLength=\{250\}/g) ?? []).length, 2);
  assert.match(createApi, /enteredBy/);
  assert.match(createApi, /description\.length > 250/);
  assert.match(createApi, /notes\.length > 250/);
  assert.match(updateApi, /Item updated/);
  assert.match(schema, /createdBy: text\("created_by"\)/);
  assert.match(schema, /export const auditLogs/);
});

test("CSV exports and the searchable admin audit page are available", async () => {
  const [masterExport, apparatusExport, adminPage, adminLogs, logsApi] = await Promise.all([
    readFile(new URL("app/api/export/route.ts", root), "utf8"),
    readFile(new URL("app/api/apparatus/[id]/export/route.ts", root), "utf8"),
    readFile(new URL("app/admin/page.tsx", root), "utf8"),
    readFile(new URL("components/admin-logs.tsx", root), "utf8"),
    readFile(new URL("app/api/admin/logs/route.ts", root), "utf8"),
  ]);

  assert.match(masterExport, /dfd-master-inventory\.csv/);
  assert.match(apparatusExport, /getInventoryExportRows/);
  assert.match(apparatusExport, /inventoryCsvResponse/);
  assert.match(adminPage, /AdminLogs/);
  assert.match(adminLogs, /Download master CSV/);
  assert.match(adminLogs, /Search person, department ID, item, or location/);
  assert.match(logsApi, /actor LIKE/);
  assert.match(logsApi, /LIMIT 500/);
});
