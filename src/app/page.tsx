"use client";

import { useEffect, useState } from "react";

type Post = {
  id: number;
  code: string;
  author: string | null;
  body: string;
  posted_at: string | null;
  created_at: string;
};

export default function Page() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/timeline", { cache: "no-store" });
    const data = await res.json();
    setPosts(data.posts);
  }

  async function refresh() {
    setLoading(true);
    await fetch("/api/refresh", { method: "POST" });
    await load();
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>掲示板タイムライン（自分用）</h1>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={refresh}
          disabled={loading}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          {loading ? "更新中..." : "更新（いまはダミー）"}
        </button>

        <button
          onClick={load}
          style={{
            padding: "8px 12px",
            border: "1px solid #ccc",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          再読込
        </button>
      </div>

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
            <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{p.body}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
