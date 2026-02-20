import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

export async function GET() {
  ensureSeeded();
  const rows = db.prepare(`
    SELECT w.code, w.created_at
    FROM watchlist w
    ORDER BY w.created_at DESC
  `).all();
  return Response.json({ watchlist: rows });
}
