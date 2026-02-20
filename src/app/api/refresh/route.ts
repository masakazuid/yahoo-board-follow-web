import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { XMLParser } from "fast-xml-parser";
import he from "he";
import crypto from "node:crypto";

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, " ");
}
function normalizeBody(s: string) {
  const decoded = he.decode(String(s ?? ""));
  const noTags = stripHtml(decoded);
  const compact = noTags.replace(/\s+/g, " ").trim();
  return compact.slice(0, 500);
}
function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST() {
  ensureSeeded();

  const feeds = db.prepare(`SELECT code, feed_url FROM feeds ORDER BY created_at DESC`).all() as Array<{
    code: string;
    feed_url: string;
  }>;

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    allowBooleanAttributes: true,
  });

  let inserted = 0;

  for (const f of feeds) {
    const feedUrl = f.feed_url?.trim();
    if (!feedUrl) continue;

    let xml = "";
    try {
      const res = await fetch(feedUrl, { headers: { "user-agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      xml = await res.text();
    } catch {
      continue;
    }

    let obj: any;
    try {
      obj = parser.parse(xml);
    } catch {
      continue;
    }

    const items = obj?.rss?.channel?.item ?? [];
    const arr = Array.isArray(items) ? items : [items];

    for (const it of arr) {
      const author = (it["dc:creator"] ?? it.author ?? "").toString().trim() || null;
      const url = (it.link ?? it.guid ?? "").toString().trim() || null;

      const pub = (it.pubDate ?? "").toString().trim();
      const posted_at = pub ? new Date(pub).toISOString() : null;

      // RSSによって description / content:encoded / title など揺れる
      const rawBody = it["content:encoded"] ?? it.description ?? it.title ?? "";
      const body = normalizeBody(String(rawBody));

      if (!body) continue;

      const hash = sha256(`${f.code}|${url ?? ""}|${posted_at ?? ""}|${body}`);

      const r = db.prepare(`
        INSERT OR IGNORE INTO posts(code, author, body, url, hash, posted_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(f.code, author, body, url, hash, posted_at);

      if (r.changes) inserted += r.changes;
    }
  }

  return Response.json({ ok: true, inserted });
}
