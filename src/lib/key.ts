import crypto from "node:crypto";

export function codeFromFeedUrl(feedUrl: string) {
  // feed_url が同じなら同じ code になる（監視銘柄の一意キー）
  return "src_" + crypto.createHash("sha1").update(feedUrl).digest("hex").slice(0, 12);
}
