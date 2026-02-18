import { db } from "@/lib/db";

export async function GET() {
  const rows = db.prepare(`
    SELECT id, code, author, body, posted_at, created_at
    FROM posts
    ORDER BY id DESC
    LIMIT 100
  `).all();

  return Response.json({ posts: rows });
}
