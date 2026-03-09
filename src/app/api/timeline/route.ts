export const dynamic = "force-dynamic";
import { db } from "@/lib/db";

export async function GET() {
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
    LEFT JOIN companies c
      ON c.code = p.code
    LEFT JOIN ignored_authors ia
      ON ia.author_key = lower(trim(replace(replace(coalesce(p.author, ''), char(10), ' '), char(13), ' ')))
    WHERE ia.author_key IS NULL
    ORDER BY
      COALESCE(p.posted_at, p.created_at) DESC,
      p.id DESC
    LIMIT 300
  `).all();

  return Response.json({ posts: rows });
}
