import { numberId } from "@/db/queries";
import { apiError, getDatabase } from "@/db/runtime";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid apparatus id." }, { status: 400 });
    const db = await getDatabase();
    const result = await db.prepare("SELECT * FROM inventory_items WHERE apparatus_id = ? ORDER BY name, id").bind(id).all();
    return Response.json({ items: result.results });
  } catch (error) {
    return apiError(error);
  }
}

