import { db } from "@/lib/db";

function isValidKey(code: string) {
  // 英数字 + 記号少し（内部ID src_xxx や ticker 想定）
  return /^[A-Za-z0-9._:-]{1,64}$/.test(code);
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

  if (!isValidKey(code)) {
    return Response.json({ ok: false, error: "invalid code" }, { status: 400 });
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
