import { apiError, getDatabase } from "@/db/runtime";
import { getInventoryExportRows, inventoryCsvResponse } from "@/lib/csv-export";

export async function GET() {
  try {
    const rows = await getInventoryExportRows(await getDatabase());
    return inventoryCsvResponse(rows, "dfd-master-inventory.csv");
  } catch (error) {
    return apiError(error);
  }
}
