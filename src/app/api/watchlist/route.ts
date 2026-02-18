import { db } from "@/lib/db";

function isValidCode(code: string) {
  return /^[0-9]{4}$/.test(code);
}

export async function GET() {
  // 新しい順（追加した順に上へ）
  const rows = db.prepare(`SELECT code, created_at FROM watchlist ORDER BY created_at DESC`).all();
  return Response.json({ watchlist: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();

  if (!isValidCode(code)) {
    return Response.json({ ok: false, error: "code must be 4 digits" }, { status: 400 });
  }

  const count = db.prepare(`SELECT COUNT(*) as n FROM watchlist`).get() as { n: number };
  if (count.n >= 100) {
    return Response.json({ ok: false, error: "watchlist limit is 100" }, { status: 400 });
  }

  db.prepare(`INSERT OR IGNORE INTO watchlist(code) VALUES (?)`).run(code);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim();

  if (!isValidCode(code)) {
    return Response.json({ ok: false, error: "invalid code" }, { status: 400 });
  }

  db.prepare(`DELETE FROM watchlist WHERE code = ?`).run(code);
  return Response.json({ ok: true });
}
