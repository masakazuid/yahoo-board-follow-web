import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

export async function GET() {
  ensureSeeded();
  const rows = db.prepare(`
    SELECT code, name
    FROM companies
    ORDER BY updated_at DESC
  `).all();
  return Response.json({ companies: rows });
}
