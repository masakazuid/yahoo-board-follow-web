import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

function pickDbPath() {
  // 本来の指定（Renderの永続ディスクを付けたら /data/... を使う）
  const desired = process.env.SQLITE_PATH || path.join(process.cwd(), "data.sqlite");

  // まず desired を試す。ディレクトリが無ければ作る。作れなければ /tmp に逃がす。
  try {
    const dir = path.dirname(desired);
    if (dir && dir !== "." && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return desired;
  } catch {
    // ビルド環境で /data が作れない等のときの逃げ道
    return "/tmp/data.sqlite";
  }
}

const dbPath = pickDbPath();
export const db = new Database(dbPath);

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
