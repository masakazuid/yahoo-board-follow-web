import { db } from "@/lib/db";

function isValidCode(code: string) {
  return /^[0-9]{4}$/.test(code);
}

export async function GET() {
  const rows = db.prepare(`
    SELECT code, name
    FROM companies
    ORDER BY updated_at DESC
  `).all();
  return Response.json({ companies: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  const name = String(body.name ?? "").trim();

  if (!isValidCode(code)) {
    return Response.json({ ok: false, error: "code must be 4 digits" }, { status: 400 });
  }
  if (!name) {
    return Response.json({ ok: false, error: "name is required" }, { status: 400 });
  }

  db.prepare(`
    INSERT INTO companies(code, name, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      updated_at = datetime('now')
  `).run(code, name);

  return Response.json({ ok: true, code, name });
}
