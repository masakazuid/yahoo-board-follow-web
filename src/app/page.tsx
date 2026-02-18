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

type Watch = {
  code: string;
  created_at: string;
};

export default function Page() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [watchlist, setWatchlist] = useState<Watch[]>([]);
  const [codeInput, setCodeInput] = useState("7203");
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

  async function refresh() {
    setLoading(true);
    setMsg("");
    const r = await fetch("/api/refresh", { method: "POST" });
    if (!r.ok) {
      const t = await r.text();
      setMsg(`refresh failed: ${t}`);
    }
    await Promise.all([loadTimeline(), loadWatchlist()]);
    setLoading(false);
  }

  async function addCode() {
    setMsg("");
    const code = codeInput.trim();
    const r = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(data.error ?? "failed");
    await loadWatchlist();
  }

  async function removeCode(code: string) {
    setMsg("");
    const r = await fetch(`/api/watchlist?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(data.error ?? "failed");
    await loadWatchlist();
  }

  useEffect(() => {
    loadWatchlist();
    loadTimeline();
  }, []);

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>掲示板タイムライン（自分用）</h1>

      <section style={{ marginTop: 14, border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>監視銘柄（最大100）</div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="例: 7203"
            style={{ padding: "8px 10px", border: "1px solid #ccc", borderRadius: 8, width: 140 }}
          />
          <button
            onClick={addCode}
            style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8, cursor: "pointer" }}
          >
            追加
          </button>

          <button
            onClick={refresh}
            disabled={loading}
            style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8, cursor: "pointer" }}
          >
            {loading ? "更新中..." : "更新（いまはダミー）"}
          </button>

          <button
            onClick={() => Promise.all([loadTimeline(), loadWatchlist()])}
            style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8, cursor: "pointer" }}
          >
            再読込
          </button>

          {msg ? <span style={{ color: "#b00020" }}>{msg}</span> : null}
        </div>

        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {watchlist.map((w) => (
            <span
              key={w.code}
              style={{
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
                border: "1px solid #ddd",
                borderRadius: 999,
                padding: "6px 10px",
              }}
            >
              <b>{w.code}</b>
              <button
                onClick={() => removeCode(w.code)}
                title="削除"
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#666",
                  fontSize: 14,
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 16 }}>
        {posts.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
            }}
          >
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
