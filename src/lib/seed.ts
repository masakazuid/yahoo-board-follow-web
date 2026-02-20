import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";

type SeedRow = {
  code: string;
  ticker: string;
  name: string;
  feed_url: string;
  message_url?: string;
};

let seeded = false;

export function seedDbOnce() {
  if (seeded) return;
  seeded = true;

  const seedPath = path.join(process.cwd(), "src/seed/seed_feeds.json");
  if (!fs.existsSync(seedPath)) return;

  const rows = JSON.parse(fs.readFileSync(seedPath, "utf8")) as SeedRow[];
  if (!Array.isArray(rows) || rows.length === 0) return;

  // “新しい順”に見せたいなら、seedの先頭ほど新しくする（秒をずらす）
  const n = rows.length;

  const upsertCompany = db.prepare(`
    INSERT INTO companies(code, name, updated_at)
    VALUES (?, ?, datetime('now', ?))
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      updated_at = excluded.updated_at
  `);

  const upsertFeed = db.prepare(`
    INSERT INTO feeds(code, feed_url, created_at)
    VALUES (?, ?, datetime('now', ?))
    ON CONFLICT(code) DO UPDATE SET
      feed_url = excluded.feed_url
  `);

  const ensureWatch = db.prepare(`
    INSERT OR IGNORE INTO watchlist(code, created_at)
    VALUES (?, datetime('now', ?))
  `);

  const tx = db.transaction(() => {
    rows.forEach((r, idx) => {
      const offset = `+${n - idx} seconds`;
      upsertCompany.run(r.code, r.name, offset);
      upsertFeed.run(r.code, r.feed_url, offset);
      ensureWatch.run(r.code, offset);
    });
  });

  tx();
}
