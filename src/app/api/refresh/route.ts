import { db } from "@/lib/db";

export async function POST() {
  const codes = (db.prepare(`SELECT code FROM watchlist ORDER BY created_at DESC LIMIT 100`).all() as { code: string }[])
    .map((r) => r.code);

  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO posts(code, author, body, url, posted_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((list: string[]) => {
    for (const code of list) {
      const body =
        `[${code}] dummy post at ${now}\n` +
        "（ここに将来Yahoo本文が入る想定です）".repeat(40);

      // 仮リンク（後で「投稿そのもの」のURLに差し替えます）
      const url = `https://finance.yahoo.co.jp/quote/${code}.T/bbs`;

      insert.run(code, "system", body, url, now);
    }
  });

  tx(codes);

  return Response.json({ ok: true, inserted: codes.length });
}
