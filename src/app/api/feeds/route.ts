import { db } from "@/lib/db";
import { createHash } from "crypto";

function makeId(feedUrl: string) {
  const hex = createHash("sha256").update(feedUrl).digest("hex").slice(0, 12);
  return `src_${hex}`; // 内部ID（画面では基本表示しない）
}

export async function GET() {
  const rows = db
    .prepare(
      `
      SELECT code, feed_url, created_at
      FROM feeds
      ORDER BY datetime(created_at) DESC
    `
    )
    .all();

  return Response.json({ feeds: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const feed_url = String(body.feed_url ?? "").trim();
  const name = String(body.name ?? "").trim();
  const codeProvided = String(body.code ?? "").trim(); // 互換のため残す（基本は使わない）

  if (!feed_url) {
    return Response.json({ ok: false, error: "feed_url is required" }, { status: 400 });
  }

  // 1) codeが明示されていればそれを使う（過去互換）
  // 2) そうでなければ feed_url で既存を探す（=コード不要で更新できる）
  // 3) なければ feed_url から内部ID生成
  let code = codeProvided;
  if (!code) {
    const exist = db
      .prepare(`SELECT code FROM feeds WHERE feed_url = ? LIMIT 1`)
      .get(feed_url) as { code?: string } | undefined;
    code = exist?.code ?? makeId(feed_url);
  }

  db.prepare(
    `
    INSERT INTO feeds(code, feed_url, created_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(code) DO UPDATE SET
      feed_url = excluded.feed_url
  `
  ).run(code, feed_url);

  // 会社名が入っていれば companies に紐付けて保存（=コード不要で会社名も更新可）
  if (name) {
    db.prepare(
      `
      INSERT INTO companies(code, name, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(code) DO UPDATE SET
        name = excluded.name,
        updated_at = datetime('now')
    `
    ).run(code, name);
  }

  return Response.json({ ok: true, code });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || url.searchParams.get("id");
  if (!code) {
    return Response.json({ ok: false, error: "code is required" }, { status: 400 });
  }
  db.prepare(`DELETE FROM feeds WHERE code = ?`).run(code);
  db.prepare(`DELETE FROM companies WHERE code = ?`).run(code); // 会社名も一緒に消す
  return Response.json({ ok: true });
}
