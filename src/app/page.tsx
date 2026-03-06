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

type Watch = {
  code: string;
  created_at: string;
};

type Feed = {
  code: string;
  feed_url: string;
  created_at: string;
};

type Company = {
  code: string;
  name: string;
};

type Disclosure = {
  id: number;
  code: string;
  company_name?: string | null;
  title: string;
  url: string | null;
  pdf_url: string | null;
  disclosed_at: string | null;
  source: string | null;
  created_at: string;
};

type TabKey = "board" | "disclosure";

export default function Page() {
  const [tab, setTab] = useState<TabKey>("board");

  const [posts, setPosts] = useState<Post[]>([]);
  const [watchlist, setWatchlist] = useState<Watch[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);

  const [nameInput, setNameInput] = useState("");
  const [rssUrlInput, setRssUrlInput] = useState("");

  const [loadingBoard, setLoadingBoard] = useState(false);
  const [loadingDisclosure, setLoadingDisclosure] = useState(false);
  const [msg, setMsg] = useState("");

  const companyMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companies) m.set(c.code, c.name);
    return m;
  }, [companies]);

  async function loadBoard() {
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

  async function loadDisclosures() {
    const r = await fetch("/api/disclosures/timeline", { cache: "no-store" }).then((x) => x.json());
    setDisclosures(r.disclosures ?? []);
  }

  async function loadAll() {
    await Promise.all([loadBoard(), loadDisclosures()]);
  }

  async function refreshBoard() {
    setLoadingBoard(true);
    setMsg("");
    const r = await fetch("/api/refresh", { method: "POST" });
    if (!r.ok) setMsg(`refresh failed: ${await r.text()}`);
    await loadBoard();
    setLoadingBoard(false);
  }

  async function refreshDisclosures() {
    setLoadingDisclosure(true);
    setMsg("");
    const r = await fetch("/api/disclosures/refresh", { method: "POST" });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(data.error ?? "disclosure refresh failed");
    } else if (data.message) {
      setMsg(String(data.message));
    }
    await loadDisclosures();
    setLoadingDisclosure(false);
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
    await loadBoard();
  }

  async function removeFeed(code: string) {
    setMsg("");
    const r = await fetch(`/api/feeds?code=${encodeURIComponent(code)}`, {
      method: "DELETE",
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(data.error ?? "failed");
    await loadBoard();
  }

  useEffect(() => {
    loadAll();
  }, []);

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 14px",
    borderRadius: 10,
    border: active ? "1px solid #111" : "1px solid #ccc",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    cursor: "pointer",
    fontWeight: 700,
  });

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, marginBottom: 16 }}>投資ウォッチャー（自分用）</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button style={tabButtonStyle(tab === "board")} onClick={() => setTab("board")}>
          掲示板
        </button>
        <button style={tabButtonStyle(tab === "disclosure")} onClick={() => setTab("disclosure")}>
          適時開示
        </button>
      </div>

      {msg ? (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "#fafafa",
          }}
        >
          {msg}
        </div>
      ) : null}

      {tab === "board" ? (
        <>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>掲示板タイムライン</h2>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="会社名（表示名）"
              style={{
                padding: "8px 10px",
                border: "1px solid #ccc",
                borderRadius: 8,
                width: 240,
              }}
            />
            <input
              value={rssUrlInput}
              onChange={(e) => setRssUrlInput(e.target.value)}
              placeholder="RSS URL（comment.xml など）"
              style={{
                padding: "8px 10px",
                border: "1px solid #ccc",
                borderRadius: 8,
                width: 560,
                maxWidth: "100%",
              }}
            />
            <button onClick={addOrUpdateFeed}>登録/更新</button>
            <button onClick={refreshBoard}>{loadingBoard ? "更新中..." : "更新（RSS取得）"}</button>
            <button onClick={loadBoard}>再読込</button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>監視（新しい順）</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {watchlist.map((w) => (
                <span
                  key={w.code}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: "#fafafa",
                  }}
                >
                  {companyMap.get(w.code) ?? "（未設定）"}
                </span>
              ))}
            </div>
          </div>

          <div style={{ color: "#666", marginBottom: 12 }}>
            ※本文は先頭500文字のみ保存・表示（続きは「元投稿を開く」へ）
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {posts.map((p) => {
              const nm = p.company_name ?? companyMap.get(p.code);
              return (
                <article
                  key={p.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 12,
                    padding: 14,
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    {nm ?? "（未設定）"} / {p.author ?? "unknown"} /{" "}
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{p.body}</div>
                  {p.url ? (
                    <div style={{ marginTop: 8 }}>
                      <a href={p.url} target="_blank" rel="noreferrer">
                        元投稿を開く ↗
                      </a>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>適時開示タイムライン</h2>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={refreshDisclosures}>
              {loadingDisclosure ? "更新中..." : "更新（適時開示取得）"}
            </button>
            <button onClick={loadDisclosures}>再読込</button>
          </div>

          <div style={{ color: "#666", marginBottom: 16 }}>
            監視中コードの適時開示を新しい順に表示します。
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {disclosures.length === 0 ? (
              <div
                style={{
                  border: "1px dashed #ccc",
                  borderRadius: 12,
                  padding: 18,
                  background: "#fafafa",
                }}
              >
                まだ適時開示データはありません。
              </div>
            ) : (
              disclosures.map((d) => {
                const nm = d.company_name ?? companyMap.get(d.code) ?? d.code;
                const shownAt = d.disclosed_at ?? d.created_at;
                return (
                  <article
                    key={d.id}
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 12,
                      padding: 14,
                      background: "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      {nm} / {new Date(shownAt).toLocaleString()}
                    </div>
                    <div style={{ marginBottom: 8 }}>{d.title}</div>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ color: "#666" }}>code: {d.code}</span>
                      {d.source ? <span style={{ color: "#666" }}>source: {d.source}</span> : null}
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noreferrer">
                          詳細 ↗
                        </a>
                      ) : null}
                      {d.pdf_url ? (
                        <a href={d.pdf_url} target="_blank" rel="noreferrer">
                          PDF ↗
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </main>
  );
}
