import { db } from "@/lib/db";
import { XMLParser } from "fast-xml-parser";

type FeedRow = { code: string; feed_url: string };

export async function POST() {
  const feeds = db.prepare(`SELECT code, feed_url FROM feeds ORDER BY created_at DESC LIMIT 100`).all() as FeedRow[];
  if (feeds.length === 0) {
    return Response.json({ ok: true, inserted: 0, note: "no feeds registered" });
  }

  let inserted = 0;
  for (const f of feeds) {
    const xml = await fetchXml(f.feed_url);
    const items = parseRssItems(xml);
    inserted += insertItems(f.code, items);
  }

  return Response.json({ ok: true, inserted });
}

async function fetchXml(url: string) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "yahoo-board-follow/0.1 (private)",
      "accept": "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return await res.text();
}

type RssItem = {
  title?: any;
  link?: any;
  guid?: any;
  pubDate?: any;
  author?: any;
  description?: any;
  content?: any;
  "content:encoded"?: any;
};

function parseRssItems(xml: string): RssItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const obj = parser.parse(xml);
  const items = obj?.rss?.channel?.item ?? [];
  return Array.isArray(items) ? items : [items].filter(Boolean);
}

function normText(v: any): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof v["#text"] === "string") return v["#text"];
  return String(v);
}

// 雑にHTMLタグ除去（必要なら後で改善）
function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, "");
}

function insertItems(code: string, items: RssItem[]) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO posts(code, author, body, url, posted_at, external_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const tx = db.transaction((rows: RssItem[]) => {
    let n = 0;
    for (const it of rows) {
      const url = normText(it.link) || null;
      const external_id = normText(it.guid) || url || `${code}:${normText(it.pubDate)}:${normText(it.title)}`;

      const bodyRaw =
        normText(it["content:encoded"]) ||
        normText(it.content) ||
        normText(it.description) ||
        normText(it.title);

      const bodyText = stripHtml(bodyRaw).trim();
      const body500 = bodyText.length > 500 ? bodyText.slice(0, 500) + "…" : bodyText;

      const author = normText(it.author) || null;
      const posted_at = normText(it.pubDate) || null;

      stmt.run(code, author, body500 || "(no body)", url, posted_at, external_id);
      n++;
    }
    return n;
  });

  return tx(items);
}
