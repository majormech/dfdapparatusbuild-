import { numberId, textValue } from "@/db/queries";
import { apiError, getDatabase } from "@/db/runtime";
import { getItemAuditContext, getLocationNames, writeAuditLog } from "@/db/audit";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid inventory item id." }, { status: 400 });
    const body = await request.json() as Record<string, unknown>;
    const name = textValue(body.name);
    const enteredBy = textValue(body.enteredBy);
    const apparatusId = numberId(String(body.apparatusId ?? body.assignedApparatus ?? ""));
    const compartmentId = numberId(String(body.compartmentId ?? body.assignedCompartment ?? ""));
    const quantity = Number(body.quantity);
    const description = textValue(body.description);
    const notes = textValue(body.notes);
    if (!enteredBy || !name || !apparatusId || !compartmentId || !Number.isFinite(quantity) || quantity < 1) {
      return Response.json({ error: "Name or department ID, item name, quantity, and assigned compartment are required." }, { status: 400 });
    }
    if (description.length > 250 || notes.length > 250) return Response.json({ error: "Descriptions and notes must be 250 characters or fewer, including spaces." }, { status: 400 });
    const db = await getDatabase();
    const before = await getItemAuditContext(db, id);
    if (!before) return Response.json({ error: "Inventory item not found." }, { status: 404 });
    const location = await getLocationNames(db, apparatusId, compartmentId);
    if (!location) return Response.json({ error: "The assigned compartment is not available on this apparatus." }, { status: 400 });
    await db.prepare(`UPDATE inventory_items SET
      apparatus_id = ?, compartment_id = ?, name = ?, equipment_type = ?, equipment_id = ?, serial_number = ?,
      quantity = ?, make = ?, model = ?, description = ?, notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`)
      .bind(
        apparatusId,
        compartmentId,
        name,
        textValue(body.equipmentType, "Other"),
        String(body.equipmentId ?? "").trim(),
        String(body.serialNumber ?? "").trim(),
        Math.floor(quantity),
        textValue(body.make),
        textValue(body.model),
        description,
        notes,
        textValue(body.status, "In Service"),
        id,
      )
      .run();
    await writeAuditLog(db, { action: "Item updated", actor: enteredBy, itemId: id, itemName: name, ...location, details: `Previous location: ${before.apparatusName} / ${before.compartmentName}` });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const id = numberId((await context.params).id);
    if (!id) return Response.json({ error: "Invalid inventory item id." }, { status: 400 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const enteredBy = textValue(body.enteredBy);
    if (!enteredBy) return Response.json({ error: "Name or department ID is required to delete an item." }, { status: 400 });
    const db = await getDatabase();
    const item = await getItemAuditContext(db, id);
    if (!item) return Response.json({ error: "Inventory item not found." }, { status: 404 });
    await db.prepare("DELETE FROM inventory_items WHERE id = ?").bind(id).run();
    await writeAuditLog(db, { action: "Item deleted", actor: enteredBy, itemId: id, itemName: item.itemName, apparatusName: item.apparatusName, compartmentName: item.compartmentName });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
