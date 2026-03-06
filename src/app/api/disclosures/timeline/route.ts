import { db } from "@/lib/db";

export async function GET() {
  const rows = db.prepare(`
    SELECT
      d.id,
      d.code,
      c.name AS company_name,
      d.title,
      d.url,
      d.pdf_url,
      d.disclosed_at,
      d.source,
      d.created_at
    FROM disclosures d
    LEFT JOIN companies c
      ON c.code = d.code
    ORDER BY
      COALESCE(d.disclosed_at, d.created_at) DESC,
      d.id DESC
    LIMIT 300
  `).all();

  return Response.json({ disclosures: rows });
}
