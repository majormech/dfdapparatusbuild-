import { numberId, textValue } from "@/db/queries";
import { apiError, getDatabase } from "@/db/runtime";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid apparatus id." }, { status: 400 });
    const db = await getDatabase();
    const result = await db.prepare(`SELECT id, apparatus_id AS apparatusId, name,
      compartment_type AS compartmentType, sort_order AS sortOrder, COALESCE(notes, '') AS notes
      FROM compartments WHERE apparatus_id = ? ORDER BY sort_order, id`).bind(id).all();
    return Response.json({ compartments: result.results });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid apparatus id." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const name = textValue(body.name);
    const compartmentType = textValue(body.compartmentType, "Other");
    if (!name) return Response.json({ error: "Compartment name is required." }, { status: 400 });
    const db = await getDatabase();
    const result = await db.prepare(`INSERT INTO compartments
      (apparatus_id, name, compartment_type, sort_order, notes) VALUES (?, ?, ?, ?, ?)`)
      .bind(id, name, compartmentType, Number(body.sortOrder) || 0, textValue(body.notes))
      .run();
    return Response.json({ id: Number(result.meta.last_row_id) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

