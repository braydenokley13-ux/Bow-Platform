"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface DeepDiveLink {
  link_id: string;
  module_id: string;
  title: string;
  url: string;
  kind: "article" | "video" | "podcast" | "other";
  description?: string;
  xp_reward: number;
  consumed: boolean;
  consumed_at?: string;
}

interface DeepDivePayload {
  ok: boolean;
  data: { links: DeepDiveLink[]; modules?: string[] };
}

const KIND_ICON: Record<string, string> = {
  article: "📄",
  video: "🎬",
  podcast: "🎙️",
  other: "🔗"
};

export default function DeepDivePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<DeepDiveLink[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [consuming, setConsuming] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<DeepDivePayload>("/api/deep-dive");
      const all = res.data.links ?? [];
      setLinks(all);
      const mods = Array.from(new Set(all.map((l) => l.module_id))).sort();
      setModules(mods);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deep-dive links");
    } finally {
      setBusy(false);
    }
  }

  async function consume(link: DeepDiveLink) {
    if (link.consumed) return;
    setConsuming(link.link_id);
    try {
      await apiFetch(`/api/deep-dive/${link.link_id}/consume`, { method: "POST" });
      setLinks((prev) =>
        prev.map((l) => (l.link_id === link.link_id ? { ...l, consumed: true, consumed_at: new Date().toISOString() } : l))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as consumed");
    } finally {
      setConsuming(null);
    }
  }

  useEffect(() => { void load(); }, []);

  const filtered = selectedModule === "all" ? links : links.filter((l) => l.module_id === selectedModule);
  const grouped = filtered.reduce<Record<string, DeepDiveLink[]>>((acc, l) => {
    (acc[l.module_id] ??= []).push(l);
    return acc;
  }, {});

  const consumedCount = links.filter((l) => l.consumed).length;
  const totalXP = links.filter((l) => l.consumed).reduce((s, l) => s + l.xp_reward, 0);

  return (
    <div className="grid gap-14">
      <PageTitle title="Deep Dive" subtitle="Optional reading, videos, and podcasts — earn XP for each one you consume" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}

      <section className="card row-14-wrap">
        <div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{consumedCount}<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.55 }}>/{links.length}</span></div>
          <div style={{ fontSize: 12, opacity: 0.55 }}>items consumed</div>
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>+{totalXP}</div>
          <div style={{ fontSize: 12, opacity: 0.55 }}>XP earned</div>
        </div>
        <button className="secondary ml-auto" style={{ alignSelf: "center" }} onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>
      </section>

      <section className="card" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className={selectedModule === "all" ? "" : "secondary"} onClick={() => setSelectedModule("all")}>All Modules</button>
        {modules.map((m) => (
          <button key={m} className={selectedModule === m ? "" : "secondary"} onClick={() => setSelectedModule(m)}>{m}</button>
        ))}
      </section>

      {Object.keys(grouped).length === 0 && !busy ? (
        <section className="card">
          <p className="m-0 text-muted-60">No deep-dive links available yet.</p>
        </section>
      ) : null}

      {Object.entries(grouped).map(([modId, modLinks]) => (
        <section key={modId} className="card p-0">
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border, #e5e7eb)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{modId}</span>
            <span className="pill" style={{ fontSize: 12 }}>
              {modLinks.filter((l) => l.consumed).length}/{modLinks.length} done
            </span>
          </div>
          {modLinks.map((link, idx) => (
            <div
              key={link.link_id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                padding: "12px 16px",
                alignItems: "start",
                borderBottom: idx < modLinks.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none",
                background: link.consumed ? "var(--bg-success, #f0fdf4)" : undefined,
                opacity: link.consumed ? 0.75 : 1
              }}
            >
              <div style={{ display: "grid", gap: 3 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span>{KIND_ICON[link.kind] ?? "🔗"}</span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 600, fontSize: 14, color: "var(--accent, #2563eb)" }}
                    onClick={() => { if (!link.consumed) void consume(link); }}
                  >
                    {link.title}
                  </a>
                  <span className="pill" style={{ fontSize: 12 }}>{link.kind}</span>
                  {link.xp_reward > 0 ? (
                    <span className="pill" style={{ fontSize: 12, background: "#fef9c3" }}>+{link.xp_reward} XP</span>
                  ) : null}
                </div>
                {link.description ? <p style={{ margin: 0, fontSize: 13, opacity: 0.65 }}>{link.description}</p> : null}
              </div>
              <div style={{ paddingTop: 2 }}>
                {link.consumed ? (
                  <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 600 }}>✓ Done</span>
                ) : (
                  <button
                    className="secondary"
                    style={{ padding: "3px 10px", fontSize: 12 }}
                    onClick={() => void consume(link)}
                    disabled={consuming === link.link_id}
                  >
                    {consuming === link.link_id ? "..." : "Mark done"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
