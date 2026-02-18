import { db } from "@/lib/db";

export async function POST() {
  // まずは動作確認：ダミー投稿を1件入れる
  const code = "7203";
  const now = new Date().toISOString();
  const body = `[${code}] dummy post at ${now}`;

  db.prepare(`
    INSERT INTO posts(code, author, body, posted_at)
    VALUES (?, ?, ?, ?)
  `).run(code, "system", body, now);

  return Response.json({ ok: true });
}
