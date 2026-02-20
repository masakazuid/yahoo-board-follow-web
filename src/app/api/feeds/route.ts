import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { codeFromFeedUrl } from "@/lib/key";

export async function GET() {
  ensureSeeded();
  const rows = db.prepare(`
    SELECT code, feed_url, created_at
    FROM feeds
    ORDER BY created_at DESC
  `).all();
  return Response.json({ feeds: rows });
}

export async function POST(req: Request) {
  ensureSeeded();
  const body = await req.json().catch(() => ({}));
  const feed_url = String(body.feed_url ?? "").trim();
  const name = String(body.name ?? "").trim();

  if (!feed_url) return Response.json({ ok: false, error: "feed_url is required" }, { status: 400 });
  if (!name) return Response.json({ ok: false, error: "name is required" }, { status: 400 });

  const code = codeFromFeedUrl(feed_url);

  db.prepare(`
    INSERT INTO companies(code, name, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      updated_at = datetime('now')
  `).run(code, name);

  db.prepare(`
    INSERT INTO feeds(code, feed_url, created_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(code) DO UPDATE SET
      feed_url = excluded.feed_url
  `).run(code, feed_url);

  db.prepare(`
    INSERT OR IGNORE INTO watchlist(code, created_at)
    VALUES (?, datetime('now'))
  `).run(code);

  return Response.json({ ok: true, code });
}

export async function DELETE(req: Request) {
  ensureSeeded();
  const url = new URL(req.url);
  const code = String(url.searchParams.get("code") ?? "").trim();
  if (!code) return Response.json({ ok: false, error: "code is required" }, { status: 400 });

  db.prepare("DELETE FROM feeds WHERE code = ?").run(code);
  db.prepare("DELETE FROM watchlist WHERE code = ?").run(code);
  db.prepare("DELETE FROM companies WHERE code = ?").run(code);
  db.prepare("DELETE FROM posts WHERE code = ?").run(code);

  return Response.json({ ok: true });
}
