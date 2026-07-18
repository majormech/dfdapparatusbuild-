import { numberId, textValue } from "@/db/queries";
import { apiError, getDatabase } from "@/db/runtime";
import { getItemAuditContext, writeAuditLog } from "@/db/audit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    const body = await request.json() as Record<string, unknown>;
    const compartmentId = numberId(String(body.compartmentId ?? ""));
    const enteredBy = textValue(body.enteredBy);
    if (!id || !compartmentId || !enteredBy) return Response.json({ error: "Item, compartment, and name or department ID are required." }, { status: 400 });
    const db = await getDatabase();
    const before = await getItemAuditContext(db, id);
    if (!before) return Response.json({ error: "Inventory item not found." }, { status: 404 });
    const compartment = await db.prepare(`SELECT c.apparatus_id AS apparatusId, c.name AS compartmentName, a.name AS apparatusName
      FROM compartments c JOIN apparatus a ON a.id = c.apparatus_id WHERE c.id = ?`)
      .bind(compartmentId)
      .first<{ apparatusId: number; compartmentName: string; apparatusName: string }>();
    if (!compartment) return Response.json({ error: "Destination compartment not found." }, { status: 404 });
    await db.prepare("UPDATE inventory_items SET apparatus_id = ?, compartment_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(compartment.apparatusId, compartmentId, id)
      .run();
    await writeAuditLog(db, { action: "Item moved", actor: enteredBy, itemId: id, itemName: before.itemName, apparatusName: compartment.apparatusName, compartmentName: compartment.compartmentName, details: `From ${before.apparatusName} / ${before.compartmentName}` });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
