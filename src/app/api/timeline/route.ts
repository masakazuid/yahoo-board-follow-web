import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";

export async function GET() {
  ensureSeeded();
  const rows = db.prepare(`
    SELECT
      p.id,
      p.code,
      c.name AS company_name,
      p.author,
      p.body,
      p.url,
      p.posted_at,
      p.created_at
    FROM posts p
    LEFT JOIN companies c ON c.code = p.code
    ORDER BY datetime(COALESCE(p.posted_at, p.created_at)) DESC, p.id DESC
    LIMIT 200
  `).all();
  return Response.json({ posts: rows });
}
