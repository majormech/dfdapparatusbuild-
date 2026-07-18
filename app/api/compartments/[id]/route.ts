import { numberId, textValue } from "@/db/queries";
import { apiError, getDatabase } from "@/db/runtime";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid compartment id." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const name = textValue(body.name);
    if (!name) return Response.json({ error: "Compartment name is required." }, { status: 400 });
    const db = await getDatabase();
    await db.prepare(`UPDATE compartments SET name = ?, compartment_type = ?, sort_order = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(name, textValue(body.compartmentType, "Other"), Number(body.sortOrder) || 0, textValue(body.notes), id)
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid compartment id." }, { status: 400 });
    const db = await getDatabase();
    const itemCount = await db.prepare("SELECT COUNT(*) AS count FROM inventory_items WHERE compartment_id = ?").bind(id).first<{ count: number }>();
    if (itemCount?.count) {
      return Response.json({ error: "Move or delete all inventory items before deleting this compartment." }, { status: 409 });
    }
    await db.prepare("DELETE FROM compartments WHERE id = ?").bind(id).run();
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

