"use client";

import { useEffect, useMemo, useState } from "react";

type Post = {
  id: number;
  code: string;
  company_name?: string | null;
  author: string | null;
  body: string;
  url: string | null;
  posted_at: string | null;
  created_at: string;
};

type Watch = { code: string; created_at: string };
type Feed = { code: string; feed_url: string; created_at: string };
type Company = { code: string; name: string };

export default function Page() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [watchlist, setWatchlist] = useState<Watch[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [nameInput, setNameInput] = useState("");
  const [rssUrlInput, setRssUrlInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const companyMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companies) m.set(c.code, c.name);
    return m;
  }, [companies]);

  async function loadAll() {
    const [t, w, f, c] = await Promise.all([
      fetch("/api/timeline", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/watchlist", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/feeds", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/companies", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setPosts(t.posts ?? []);
    setWatchlist(w.watchlist ?? []);
    setFeeds(f.feeds ?? []);
    setCompanies(c.companies ?? []);
  }

  async function refresh() {
    setLoading(true);
    setMsg("");
    const r = await fetch("/api/refresh", { method: "POST" });
    if (!r.ok) setMsg(`refresh failed: ${await r.text()}`);
    await loadAll();
    setLoading(false);
  }

  async function addOrUpdateFeed() {
    setMsg("");
    const feed_url = rssUrlInput.trim();
    const name = nameInput.trim();
    const r = await fetch("/api/feeds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ feed_url, name }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(data.error ?? "failed");
    setRssUrlInput("");
    await loadAll();
  }

  async function removeFeed(code: string) {
    setMsg("");
    const r = await fetch(`/api/feeds?code=${encodeURIComponent(code)}`, { method: "DELETE" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(data.error ?? "failed");
    await loadAll();
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>掲示板タイムライン（自分用）</h1>

      <section style={{ marginTop: 14, border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>RSS登録（会社名 + URL だけ）</div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="会社名（表示名）"
            style={{ padding: "8px 10px", border: "1px solid #ccc", borderRadius: 8, width: 240 }}
          />
          <input
            value={rssUrlInput}
            onChange={(e) => setRssUrlInput(e.target.value)}
            placeholder="RSS URL（comment.xml など）"
            style={{ padding: "8px 10px", border: "1px solid #ccc", borderRadius: 8, width: 560, maxWidth: "100%" }}
          />
          <button onClick={addOrUpdateFeed} style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8, cursor: "pointer" }}>
            登録/更新
          </button>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={refresh} disabled={loading} style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8, cursor: "pointer" }}>
            {loading ? "更新中..." : "更新（RSS取得）"}
          </button>
          <button onClick={loadAll} style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 8, cursor: "pointer" }}>
            再読込
          </button>
          {msg ? <span style={{ color: "#b00020" }}>{msg}</span> : null}
        </div>

        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {feeds.map((f) => {
            const nm = companyMap.get(f.code);
            return (
              <span key={f.code} style={{ display: "inline-flex", gap: 10, alignItems: "center", border: "1px solid #ddd", borderRadius: 999, padding: "6px 10px" }}>
                <b>{nm ?? "（未設定）"}</b>
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
            );
          })}
        </div>

        <div style={{ marginTop: 14, color: "#666", fontSize: 12 }}>
          ※本文は先頭500文字のみ保存・表示（続きは「元投稿を開く」へ）
        </div>
      </section>

      <section style={{ marginTop: 14, border: "1px solid #e5e5e5", borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>監視（新しい順）</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {watchlist.map((w) => (
            <span key={w.code} style={{ border: "1px solid #ddd", borderRadius: 999, padding: "6px 10px" }}>
              <b>{companyMap.get(w.code) ?? "（未設定）"}</b>
            </span>
          ))}
        </div>
      </section>

      <div style={{ marginTop: 16 }}>
        {posts.map((p) => {
          const nm = p.company_name ?? companyMap.get(p.code);
          return (
            <div key={p.id} style={{ border: "1px solid #e5e5e5", borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <span style={{ fontWeight: 700 }}>{nm ?? "（未設定）"}</span>
                <span style={{ color: "#666" }}>{p.author ?? "unknown"}</span>
                <span style={{ marginLeft: "auto", color: "#999", fontSize: 12 }}>
                  {new Date(p.created_at).toLocaleString()}
                </span>
              </div>

              <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{p.body}</div>

              {p.url ? (
                <div style={{ marginTop: 8 }}>
                  <a href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                    元投稿を開く ↗
                  </a>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </main>
  );
}
