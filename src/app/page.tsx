"use client";

import { useEffect, useState } from "react";

type Post = {
  id: number;
  code: string;
  author: string | null;
  body: string;
  url: string | null;
  posted_at: string | null;
  created_at: string;
};

type Watch = { code: string; created_at: string };
type Feed = { code: string; feed_url: string; created_at: string };

export default function Page() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [watchlist, setWatchlist] = useState<Watch[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);

  const [codeInput, setCodeInput] = useState("1376");
  const [feedUrlInput, setFeedUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function loadTimeline() {
    const res = await fetch("/api/timeline", { cache: "no-store" });
    const data = await res.json();
    setPosts(data.posts);
  }
  async function loadWatchlist() {
    const res = await fetch("/api/watchlist", { cache: "no-store" });
    const data = await res.json();
    setWatchlist(data.watchlist);
  }
  async function loadFeeds() {
    const res = await fetch("/api/feeds", { cache: "no-store" });
    const data = await res.json();
    setFeeds(data.feeds);
  }

  async function refresh() {
    setLoading(true);
    setMsg("");
    const r = await fetch("/api/refresh", { method: "POST" });
    if (!r.ok) setMsg(`refresh failed: ${await r.text()}`);
    await Promise.all([loadTimeline(), loadWatchlist(), loadFeeds()]);
    setLoading(false);
  }

  async function addFeed() {
    setMsg("");
    const code = codeInput.trim();
    const feed_url = feedUrlInput.trim();
    const r = await fetch("/api/feeds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, feed_url }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(data.error ?? "failed");
    setFeedUrlInput("");
    await Promise.all([loadFeeds(), loadWatchlist()]);
  }

  async function removeFeed(code: string) {
    setMsg("");
    const r = await fetch(`/api/feeds?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(data.error ?? "failed");
    await loadFeeds();
  }

  useEffect(() => {
    loadFeeds();
    loadWatchlist();
    loadTimeline();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>掲示板タイムライン（自分用）</h1>

      <section style={{ marginTop: 14, border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>RSS登録（監視銘柄ごと）</div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="銘柄コード(4桁)"
            style={{ padding: "8px 10px", border: "1px solid #ccc", borderRadius: 8, width: 160 }}
          />
          <input
            value={feedUrlInput}
            onChange={(e) => setFeedUrlInput(e.target.value)}
            placeholder="RSS URL（comment.xml など）"
            style={{ padding: "8px 10px", border: "1px solid #ccc", borderRadius: 8, width: 460, maxWidth: "100%" }}
          />
          <button onClick={addFeed} style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8, cursor: "pointer" }}>
            登録/更新
          </button>

          <button onClick={refresh} disabled={loading} style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8, cursor: "pointer" }}>
            {loading ? "更新中..." : "更新（RSS取得）"}
          </button>

          {msg ? <span style={{ color: "#b00020" }}>{msg}</span> : null}
        </div>

        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {feeds.map((f) => (
            <span key={f.code} style={{ display: "inline-flex", gap: 10, alignItems: "center", border: "1px solid #ddd", borderRadius: 999, padding: "6px 10px" }}>
              <b>{f.code}</b>
              <a href={f.feed_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#444" }}>
                RSS ↗
              </a>
              <button
                onClick={() => removeFeed(f.code)}
                title="削除"
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "#666", fontSize: 14 }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>

        <div style={{ marginTop: 14, color: "#666", fontSize: 12 }}>
          ※本文は先頭500文字のみ保存・表示（続きは「元投稿を開く」へ）
        </div>
      </section>

      <section style={{ marginTop: 14, border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>監視銘柄（新しい順）</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {watchlist.map((w) => (
            <span key={w.code} style={{ border: "1px solid #ddd", borderRadius: 999, padding: "6px 10px" }}>
              <b>{w.code}</b>
            </span>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 16 }}>
        {posts.map((p) => (
          <div key={p.id} style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span style={{ fontWeight: 700 }}>[{p.code}]</span>
              <span style={{ color: "#666" }}>{p.author ?? "unknown"}</span>
              <span style={{ marginLeft: "auto", color: "#999", fontSize: 12 }}>
                {new Date(p.created_at).toLocaleString()}
              </span>
            </div>

            <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
              {p.body.length > 500 ? p.body.slice(0, 500) + "…" : p.body}
            </div>

            {p.url ? (
              <div style={{ marginTop: 8 }}>
                <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                  元投稿を開く ↗
                </a>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </main>
  );
}
