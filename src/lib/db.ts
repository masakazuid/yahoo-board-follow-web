import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), "data.sqlite");
export const db = new Database(dbPath);

// 初回だけテーブル作る
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
`);
