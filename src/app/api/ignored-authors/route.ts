export const dynamic = "force-dynamic";
import { db } from "@/lib/db";

function normalizeAuthor(v: unknown) {
  return String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export async function GET() {
  const rows = db.prepare(`
    SELECT author_key, author_label, created_at
    FROM ignored_authors
    ORDER BY created_at DESC, author_label ASC
  `).all();

  return Response.json({ ignored_authors: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const authorLabel = String(body.author ?? "").trim();
  const authorKey = normalizeAuthor(authorLabel);

  if (!authorLabel || !authorKey) {
    return Response.json(
      { ok: false, error: "author is required" },
      { status: 400 }
    );
  }

  db.prepare(`
    INSERT INTO ignored_authors(author_key, author_label, created_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(author_key) DO UPDATE SET
      author_label = excluded.author_label
  `).run(authorKey, authorLabel);

  return Response.json({ ok: true, author_key: authorKey, author_label: authorLabel });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const author = String(url.searchParams.get("author") ?? "").trim();
  const authorKey = normalizeAuthor(author);

  if (!authorKey) {
    return Response.json(
      { ok: false, error: "author is required" },
      { status: 400 }
    );
  }

  db.prepare(`DELETE FROM ignored_authors WHERE author_key = ?`).run(authorKey);
  return Response.json({ ok: true });
}
