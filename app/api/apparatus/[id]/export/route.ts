import { numberId } from "@/db/queries";
import { apiError, getDatabase } from "@/db/runtime";
import { csvFilename, getInventoryExportRows, inventoryCsvResponse } from "@/lib/csv-export";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid apparatus id." }, { status: 400 });
    const db = await getDatabase();
    const apparatus = await db.prepare("SELECT name FROM apparatus WHERE id = ?").bind(id).first<{ name: string }>();
    if (!apparatus) return Response.json({ error: "Apparatus not found." }, { status: 404 });
    const rows = await getInventoryExportRows(db, id);
    return inventoryCsvResponse(rows, `${csvFilename(apparatus.name)}-inventory.csv`);
  } catch (error) {
    return apiError(error);
  }
}
