import { db } from "@/lib/db";

function isValidCode(code: string) {
  return /^[0-9]{4}$/.test(code);
}
function isValidUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET() {
  const rows = db.prepare(`SELECT code, feed_url, created_at FROM feeds ORDER BY created_at DESC`).all();
  return Response.json({ feeds: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  const feed_url = String(body.feed_url ?? "").trim();

  if (!isValidCode(code)) {
    return Response.json({ ok: false, error: "code must be 4 digits" }, { status: 400 });
  }
  if (!isValidUrl(feed_url)) {
    return Response.json({ ok: false, error: "feed_url must be a valid http(s) URL" }, { status: 400 });
  }

  // watchlistにも入れておく（使い勝手のため）
  const count = db.prepare(`SELECT COUNT(*) as n FROM watchlist`).get() as { n: number };
  if (count.n >= 100) {
    return Response.json({ ok: false, error: "watchlist limit is 100" }, { status: 400 });
  }
  db.prepare(`INSERT OR IGNORE INTO watchlist(code) VALUES (?)`).run(code);

  db.prepare(`INSERT OR REPLACE INTO feeds(code, feed_url) VALUES (?, ?)`).run(code, feed_url);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") ?? "").trim();
  if (!isValidCode(code)) {
    return Response.json({ ok: false, error: "invalid code" }, { status: 400 });
  }
  db.prepare(`DELETE FROM feeds WHERE code = ?`).run(code);
  return Response.json({ ok: true });
}
