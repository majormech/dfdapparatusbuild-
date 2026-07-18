import { getApparatusDetail, listApparatus, textValue } from "@/db/queries";
import { apiError, getDatabase } from "@/db/runtime";
import { inferCompartmentType, templateDefinitions } from "@/lib/fire-data";

export async function GET() {
  try {
    const apparatus = await listApparatus(await getDatabase());
    return Response.json({ apparatus });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = textValue(body.name);
    const type = textValue(body.type);
    const stationNumber = textValue(body.stationNumber);
    const template = textValue(body.template, "Blank/custom");
    if (!name || !type) {
      return Response.json({ error: "Apparatus name and type are required." }, { status: 400 });
    }

    const db = await getDatabase();
    const existing = await db.prepare("SELECT id FROM apparatus WHERE lower(name) = lower(?)").bind(name).first();
    if (existing) return Response.json({ error: "An apparatus with this name already exists." }, { status: 409 });

    const result = await db.prepare(`INSERT INTO apparatus
      (name, type, station_number, is_reserve, status, notes)
      VALUES (?, ?, ?, ?, 'Active', ?)`)
      .bind(name, type, stationNumber, body.isReserve ? 1 : 0, textValue(body.notes))
      .run();
    const id = Number(result.meta.last_row_id);
    const compartments = templateDefinitions[template] ?? [];
    if (compartments.length) {
      await db.batch(compartments.map((compartmentName, index) => db
        .prepare("INSERT INTO compartments (apparatus_id, name, compartment_type, sort_order, notes) VALUES (?, ?, ?, ?, '')")
        .bind(id, compartmentName, inferCompartmentType(compartmentName), index + 1)));
    }
    return Response.json({ apparatus: await getApparatusDetail(db, id) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

