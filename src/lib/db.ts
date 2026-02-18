import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

function pickDbPath() {
  const desired = process.env.SQLITE_PATH || path.join(process.cwd(), "data.sqlite");
  try {
    const dir = path.dirname(desired);
    if (dir && dir !== "." && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return desired;
  } catch {
    return "/tmp/data.sqlite";
  }
}

const dbPath = pickDbPath();
export const db = new Database(dbPath);

// schema
db.exec(`
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  author TEXT,
  body TEXT NOT NULL,
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_code_created_at ON posts(code, created_at DESC);

CREATE TABLE IF NOT EXISTS watchlist (
  code TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 初期値（最低1銘柄）
INSERT OR IGNORE INTO watchlist(code) VALUES ('7203');
`);
