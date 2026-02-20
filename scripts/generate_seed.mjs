import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const inPath = path.join(ROOT, "src/seed/portfolio.json");
const outPath = path.join(ROOT, "src/seed/seed_feeds.json");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

function codeFromFeedUrl(feedUrl) {
  // あなたの現状実装に合わせて（安定・短い）ID化：src_<sha1の先頭12桁>
  return "src_" + crypto.createHash("sha1").update(feedUrl).digest("hex").slice(0, 12);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`fetch failed ${res.status} ${url}`);
  return await res.text();
}

function findMessageUrl(html) {
  // 1) 絶対URL
  const abs = html.match(/https:\/\/finance\.yahoo\.co\.jp\/cm\/message\/[^"'?\s]+/);
  if (abs) return abs[0];

  // 2) 相対URL
  const rel = html.match(/href="(\/cm\/message\/[^"?#]+)"/);
  if (rel) return "https://finance.yahoo.co.jp" + rel[1];

  return null;
}

function parseMessageUrl(messageUrl) {
  const m = messageUrl.match(/\/cm\/message\/([^/]+)\/([^/]+)/);
  if (!m) throw new Error(`cannot parse message url: ${messageUrl}`);
  return { board: m[1], thread: m[2] };
}

async function resolveOne({ ticker, name }) {
  const forumUrl = `https://finance.yahoo.co.jp/quote/${encodeURIComponent(ticker)}.T/forum`;
  const quoteUrl = `https://finance.yahoo.co.jp/quote/${encodeURIComponent(ticker)}.T`;

  let html = await fetchText(forumUrl).catch(() => null);
  let msgUrl = html ? findMessageUrl(html) : null;

  if (!msgUrl) {
    html = await fetchText(quoteUrl);
    msgUrl = findMessageUrl(html);
  }
  if (!msgUrl) throw new Error(`message url not found for ${ticker}`);

  const { board, thread } = parseMessageUrl(msgUrl);
  const message_url = `https://finance.yahoo.co.jp/cm/message/${board}/${thread}`;
  const feed_url = `https://finance.yahoo.co.jp/cm/rss/${board}/${thread}/comment.xml`;

  return {
    ticker,
    name,
    message_url,
    feed_url,
    code: codeFromFeedUrl(feed_url),
  };
}

async function mapLimit(items, limit, fn) {
  const ret = [];
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return ret;
}

const portfolio = JSON.parse(fs.readFileSync(inPath, "utf8"));
const rows = await mapLimit(portfolio, 3, resolveOne);

fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf8");
console.log(`✅ wrote ${outPath} (${rows.length} rows)`);
