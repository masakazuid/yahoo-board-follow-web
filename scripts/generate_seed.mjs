import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const inPath = path.join(ROOT, "src/seed/portfolio.json");
const outPath = path.join(ROOT, "src/seed/seed_feeds.json");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": UA,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`fetch failed ${res.status}: ${url}`);
  return await res.text();
}

function pickRssUrl(html) {
  // 直接 comment.xml が出ていればそれを採用
  const m1 = html.match(/https:\/\/finance\.yahoo\.co\.jp\/cm\/rss\/[^"' \n]+comment\.xml/);
  if (m1) return m1[0];

  // 掲示板スレURLを拾って rss URL に変換
  const m2 =
    html.match(/https:\/\/finance\.yahoo\.co\.jp\/cm\/message\/([^/]+)\/([^"'?\s]+)/) ||
    html.match(/href="(\/cm\/message\/([^/]+)\/([^"?#]+))"/);

  if (!m2) return null;

  let board, thread;
  if (m2[0].startsWith("http")) {
    const mm = m2[0].match(/\/cm\/message\/([^/]+)\/([^/]+)/);
    board = mm?.[1]; thread = mm?.[2];
  } else {
    board = m2[2]; thread = m2[3];
  }
  if (!board || !thread) return null;

  return `https://finance.yahoo.co.jp/cm/rss/${board}/${thread}/comment.xml`;
}

async function resolveOne({ ticker, name }) {
  // まず forum を狙い、ダメなら quote トップを当てる
  const urls = [
    `https://finance.yahoo.co.jp/quote/${encodeURIComponent(ticker)}.T/forum`,
    `https://finance.yahoo.co.jp/quote/${encodeURIComponent(ticker)}.T`,
  ];

  for (const u of urls) {
    try {
      const html = await fetchText(u);
      const rss = pickRssUrl(html);
      if (rss) return { name, feed_url: rss };
    } catch {
      // continue
    }
  }
  return { name, feed_url: "" }; // 見つからなければ空
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

const portfolio = JSON.parse(fs.readFileSync(inPath, "utf8"));
const rows = await mapLimit(portfolio, 3, resolveOne);

// 空URLは最後にまとめて表示
const missing = rows.filter((r) => !r.feed_url).map((r) => r.name);

fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), "utf8");
console.log(`✅ wrote ${outPath} (${rows.length} rows)`);
if (missing.length) {
  console.log("⚠ RSSが見つからなかった会社（あとで手入力で埋めてもOK）:");
  for (const n of missing) console.log(" - " + n);
}
