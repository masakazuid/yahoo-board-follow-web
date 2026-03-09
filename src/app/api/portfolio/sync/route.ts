import { db } from "@/lib/db";

type Row = {
  code: string;
  name: string;
  feed_url?: string | null;
};

function normCode(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}

function normName(v: unknown) {
  return String(v ?? "").trim();
}

function normFeed(v: unknown) {
  const s = String(v ?? "").trim();
  return s || null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rows = Array.isArray(body?.rows) ? (body.rows as Row[]) : [];

  if (!rows.length) {
    return Response.json({ ok: false, error: "rows are required" }, { status: 400 });
  }

  const cleaned = rows
    .map((r) => ({
      code: normCode(r.code),
      name: normName(r.name),
      feed_url: normFeed(r.feed_url),
    }))
    .filter((r) => r.code && r.name);

  if (!cleaned.length) {
    return Response.json({ ok: false, error: "no valid rows" }, { status: 400 });
  }

  const keepCodes = cleaned.map((r) => r.code);

  const upsertCompany = db.prepare(`
    INSERT INTO companies(code, name, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(code) DO UPDATE SET
      name = excluded.name,
      updated_at = datetime('now')
  `);

  const insertWatch = db.prepare(`
    INSERT OR IGNORE INTO watchlist(code, created_at)
    VALUES (?, datetime('now'))
  `);

  const upsertFeed = db.prepare(`
    INSERT INTO feeds(code, feed_url, created_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(code) DO UPDATE SET
      feed_url = excluded.feed_url
  `);

  const deleteMissingWatch = db.prepare(`
    DELETE FROM watchlist
    WHERE code NOT IN (` + keepCodes.map(() => "?").join(",") + `)
  `);

  const deleteMissingCompanies = db.prepare(`
    DELETE FROM companies
    WHERE code NOT IN (` + keepCodes.map(() => "?").join(",") + `)
  `);

  const deleteMissingFeeds = db.prepare(`
    DELETE FROM feeds
    WHERE code NOT IN (` + keepCodes.map(() => "?").join(",") + `)
  `);

  let feedCount = 0;

  const tx = db.transaction(() => {
    for (const r of cleaned) {
      upsertCompany.run(r.code, r.name);
      insertWatch.run(r.code);
      if (r.feed_url) {
        upsertFeed.run(r.code, r.feed_url);
        feedCount += 1;
      }
    }

    deleteMissingWatch.run(...keepCodes);
    deleteMissingCompanies.run(...keepCodes);
    deleteMissingFeeds.run(...keepCodes);
  });

  tx();

  return Response.json({
    ok: true,
    portfolio_count: cleaned.length,
    feed_count: feedCount
  });
}
