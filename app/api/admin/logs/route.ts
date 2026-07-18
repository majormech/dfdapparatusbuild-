import { apiError, getDatabase } from "@/db/runtime";

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
    const pattern = `%${search}%`;
    const db = await getDatabase();
    const result = await db.prepare(`SELECT
      id,
      action,
      actor,
      item_id AS itemId,
      item_name AS itemName,
      apparatus_name AS apparatusName,
      compartment_name AS compartmentName,
      details,
      created_at AS createdAt
    FROM audit_logs
    WHERE ? = '' OR actor LIKE ? OR item_name LIKE ? OR apparatus_name LIKE ? OR compartment_name LIKE ? OR action LIKE ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 500`)
      .bind(search, pattern, pattern, pattern, pattern, pattern)
      .all();
    return Response.json({ logs: result.results });
  } catch (error) {
    return apiError(error);
  }
}
