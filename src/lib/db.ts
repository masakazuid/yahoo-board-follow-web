import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

function resolveDbPath() {
  const p = process.env.SQLITE_PATH || path.join(process.cwd(), "data.sqlite");
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return p;
}

export const db = new Database(resolveDbPath());

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    author TEXT,
    body TEXT NOT NULL,
    url TEXT,
    posted_at TEXT,
    hash TEXT UNIQUE,
    external_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS companies (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS watchlist (
    code TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feeds (
    code TEXT PRIMARY KEY,
    feed_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS disclosures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    pdf_url TEXT,
    disclosed_at TEXT,
    source TEXT,
    external_id TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ignored_authors (
    author_key TEXT PRIMARY KEY,
    author_label TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_external_id
    ON posts(external_id);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_hash
    ON posts(hash);

  CREATE INDEX IF NOT EXISTS idx_posts_created_at
    ON posts(created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_posts_code_created_at
    ON posts(code, created_at DESC);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_disclosures_external_id
    ON disclosures(external_id);

  CREATE INDEX IF NOT EXISTS idx_disclosures_disclosed_at
    ON disclosures(disclosed_at DESC, id DESC);

  CREATE INDEX IF NOT EXISTS idx_disclosures_code_disclosed_at
    ON disclosures(code, disclosed_at DESC, id DESC);
`);

for (const sql of [
  `ALTER TABLE posts ADD COLUMN url TEXT;`,
  `ALTER TABLE posts ADD COLUMN external_id TEXT;`,
  `ALTER TABLE posts ADD COLUMN hash TEXT;`,
]) {
  try {
    db.exec(sql);
  } catch {}
}

try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_external_id ON posts(external_id);`);
} catch {}

try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_hash ON posts(hash);`);
} catch {}
