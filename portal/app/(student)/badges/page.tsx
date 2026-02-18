"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface BadgeEarner {
  email: string;
  name?: string;
  earned_at: string;
}

interface Badge {
  badge_id: string;
  name: string;
  description: string;
  criteria: string;
  icon: string;
  category: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  earned: boolean;
  earned_at?: string;
  earner_count: number;
  earners?: BadgeEarner[];
}

interface BadgesPayload {
  ok: boolean;
  data: Badge[];
}

interface BadgeDetailPayload {
  ok: boolean;
  data: Badge;
}

const RARITY_COLOR: Record<string, string> = {
  common: "#6b7280",
  uncommon: "#16a34a",
  rare: "#2563eb",
  legendary: "#d97706"
};

const RARITY_BG: Record<string, string> = {
  common: "#f3f4f6",
  uncommon: "#f0fdf4",
  rare: "#eff6ff",
  legendary: "#fffbeb"
};

export default function BadgesPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selected, setSelected] = useState<Badge | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "earned" | "locked">("all");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<BadgesPayload>("/api/badges");
      setBadges(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load badges");
    } finally {
      setBusy(false);
    }
  }

  async function openBadge(b: Badge) {
    setSelected(b);
    setLoadingDetail(true);
    try {
      const res = await apiFetch<BadgeDetailPayload>(`/api/badges?badge_id=${b.badge_id}`);
      setSelected(res.data);
    } catch {
      // keep partial data
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const categories = ["all", ...Array.from(new Set(badges.map((b) => b.category))).sort()];
  const filtered = badges
    .filter((b) => filterCategory === "all" || b.category === filterCategory)
    .filter((b) => filterStatus === "all" || (filterStatus === "earned" ? b.earned : !b.earned));

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Badge Wall" subtitle="Every badge you can earn — collect them all" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}

      <section className="card" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>
            {earnedCount}<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.55 }}>/{badges.length}</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.55 }}>badges earned</div>
        </div>
        <button className="secondary" style={{ marginLeft: "auto", alignSelf: "center" }} onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>
      </section>

      <section className="card" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {categories.map((c) => (
          <button key={c} className={filterCategory === c ? "" : "secondary"} onClick={() => setFilterCategory(c)}>
            {c === "all" ? "All" : c}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {(["all", "earned", "locked"] as const).map((s) => (
            <button key={s} className={filterStatus === s ? "" : "secondary"} onClick={() => setFilterStatus(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {filtered.map((b) => (
          <button
            key={b.badge_id}
            onClick={() => void openBadge(b)}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "grid",
              gap: 6,
              padding: 14,
              borderRadius: 10,
              border: `1px solid ${b.earned ? RARITY_COLOR[b.rarity] + "66" : "var(--border, #e5e7eb)"}`,
              background: b.earned ? RARITY_BG[b.rarity] : "var(--card, #fff)",
              opacity: b.earned ? 1 : 0.5,
              filter: b.earned ? "none" : "grayscale(1)",
              textAlign: "center",
              alignItems: "center",
              justifyItems: "center"
            }}
          >
            <div style={{ fontSize: 40 }}>{b.icon || "🏅"}</div>
            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{b.name}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{b.category}</div>
            <div style={{
              fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
              background: RARITY_COLOR[b.rarity] + "22", color: RARITY_COLOR[b.rarity]
            }}>
              {b.rarity}
            </div>
            {b.earned ? (
              <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ Earned</div>
            ) : (
              <div style={{ fontSize: 11, opacity: 0.5 }}>🔒 Locked</div>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && !busy ? (
        <section className="card"><p style={{ margin: 0, opacity: 0.6 }}>No badges match your filters.</p></section>
      ) : null}

      {selected ? (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: "var(--card, #fff)", borderRadius: "16px 16px 0 0",
              padding: 24, maxWidth: 520, width: "100%", maxHeight: "80vh", overflowY: "auto",
              display: "grid", gap: 12
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 64 }}>{selected.icon || "🏅"}</div>
              <h2 style={{ margin: "8px 0 0" }}>{selected.name}</h2>
              <div style={{
                display: "inline-block", marginTop: 4, fontSize: 12, fontWeight: 700,
                padding: "2px 10px", borderRadius: 99,
                background: RARITY_COLOR[selected.rarity] + "22", color: RARITY_COLOR[selected.rarity]
              }}>
                {selected.rarity} · {selected.category}
              </div>
            </div>

            <p style={{ margin: 0 }}>{selected.description}</p>

            <div style={{ padding: "10px 14px", background: "var(--bg2, #f9fafb)", borderRadius: 8 }}>
              <div className="kicker" style={{ marginBottom: 4 }}>How to unlock</div>
              <p style={{ margin: 0, fontSize: 14 }}>{selected.criteria}</p>
            </div>

            {selected.earned ? (
              <div style={{ color: "#16a34a", fontWeight: 600 }}>
                ✓ You earned this on {new Date(selected.earned_at!).toLocaleDateString()}
              </div>
            ) : (
              <div style={{ opacity: 0.5 }}>🔒 Not yet earned</div>
            )}

            <div>
              <div className="kicker" style={{ marginBottom: 6 }}>
                {loadingDetail ? "Loading earners..." : `${selected.earner_count ?? 0} classmate${(selected.earner_count ?? 0) !== 1 ? "s" : ""} earned this`}
              </div>
              {(selected.earners ?? []).length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selected.earners!.map((e) => (
                    <span key={e.email} className="pill" style={{ fontSize: 12 }}>
                      {e.name ?? e.email}
                    </span>
                  ))}
                </div>
              ) : !loadingDetail ? (
                <p style={{ margin: 0, opacity: 0.5, fontSize: 13 }}>No classmates have earned this yet.</p>
              ) : null}
            </div>

            <button className="secondary" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
