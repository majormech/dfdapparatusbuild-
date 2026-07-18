import { numberId, textValue } from "@/db/queries";
import { apiError, getDatabase } from "@/db/runtime";
import { getLocationNames, writeAuditLog } from "@/db/audit";

export async function POST(request: Request) {
  try {
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
    const location = await getLocationNames(db, apparatusId, compartmentId);
    if (!location) return Response.json({ error: "The assigned compartment is not available on this apparatus." }, { status: 400 });
    const result = await db.prepare(`INSERT INTO inventory_items (
      apparatus_id, compartment_id, name, equipment_type, equipment_id, serial_number,
      quantity, make, model, description, notes, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
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
        enteredBy,
      )
      .run();
    const id = Number(result.meta.last_row_id);
    await writeAuditLog(db, { action: "Item added", actor: enteredBy, itemId: id, itemName: name, ...location, details: `Quantity: ${Math.floor(quantity)}` });
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
