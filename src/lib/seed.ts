import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { codeFromFeedUrl } from "@/lib/key";

type SeedRow = { name: string; feed_url: string };

let done = false;

export function ensureSeeded() {
  if (done) return;
  done = true;

  // 既にfeedsがあるなら何もしない（あなたが追加した設定を壊さない）
  const nFeeds = (db.prepare("SELECT COUNT(*) AS n FROM feeds").get() as any)?.n ?? 0;
  if (nFeeds > 0) return;

  const seedPath = path.join(process.cwd(), "src/seed/seed_feeds.json");
  if (!fs.existsSync(seedPath)) return;

  const rows = JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedRow[];
  if (!Array.isArray(rows) || rows.length === 0) return;

  const upsertCompany = db.prepare(`
    INSERT INTO companies(code, name, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      updated_at = datetime('now')
  `);

  const upsertFeed = db.prepare(`
    INSERT INTO feeds(code, feed_url, created_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(code) DO UPDATE SET
      feed_url = excluded.feed_url
  `);

  const addWatch = db.prepare(`
    INSERT OR IGNORE INTO watchlist(code, created_at)
    VALUES (?, datetime('now'))
  `);

  const tx = db.transaction(() => {
    for (const r of rows) {
      const feed_url = String(r.feed_url ?? "").trim();
      const name = String(r.name ?? "").trim();
      if (!feed_url || !name) continue;

      const code = codeFromFeedUrl(feed_url);
      upsertCompany.run(code, name);
      upsertFeed.run(code, feed_url);
      addWatch.run(code);
    }
  });

  tx();
}
