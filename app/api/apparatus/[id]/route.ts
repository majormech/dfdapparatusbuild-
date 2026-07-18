import { getApparatusDetail, numberId, textValue } from "@/db/queries";
import { apiError, getDatabase } from "@/db/runtime";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid apparatus id." }, { status: 400 });
    const apparatus = await getApparatusDetail(await getDatabase(), id);
    return apparatus
      ? Response.json({ apparatus })
      : Response.json({ error: "Apparatus not found." }, { status: 404 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid apparatus id." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const name = textValue(body.name);
    const type = textValue(body.type);
    if (!name || !type) return Response.json({ error: "Name and type are required." }, { status: 400 });
    const db = await getDatabase();
    await db.prepare(`UPDATE apparatus SET
      name = ?, type = ?, station_number = ?, is_reserve = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`)
      .bind(name, type, textValue(body.stationNumber), body.isReserve ? 1 : 0, textValue(body.status, "Active"), textValue(body.notes), id)
      .run();
    const apparatus = await getApparatusDetail(db, id);
    return apparatus
      ? Response.json({ apparatus })
      : Response.json({ error: "Apparatus not found." }, { status: 404 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid apparatus id." }, { status: 400 });
    const db = await getDatabase();
    await db.batch([
      db.prepare("DELETE FROM inventory_items WHERE apparatus_id = ?").bind(id),
      db.prepare("DELETE FROM compartments WHERE apparatus_id = ?").bind(id),
      db.prepare("DELETE FROM apparatus WHERE id = ?").bind(id),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

