"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Trophy {
  trophy_id: string;
  season_id: string;
  season_title: string;
  season_ends_at: string;
  placement: 1 | 2 | 3;
  final_xp: number;
  final_rank: number;
  total_students: number;
}

interface TrophyPayload {
  ok: boolean;
  data: Trophy[];
}

const PLACEMENT_ICON: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const PLACEMENT_LABEL: Record<number, string> = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" };
const PLACEMENT_COLOR: Record<number, string> = { 1: "#d97706", 2: "#6b7280", 3: "#b45309" };

export default function TrophyCasePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trophies, setTrophies] = useState<Trophy[]>([]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<TrophyPayload>("/api/trophy-case");
      const sorted = (res.data ?? []).sort(
        (a, b) => new Date(b.season_ends_at).getTime() - new Date(a.season_ends_at).getTime()
      );
      setTrophies(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trophy case");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Trophy Case" subtitle="Permanent record of your top-3 season finishes" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}

      <section className="card" style={{ display: "flex", gap: 8 }}>
        <button className="secondary" onClick={() => void load()} disabled={busy}>{busy ? "Loading..." : "Refresh"}</button>
        <span style={{ fontSize: 13, opacity: 0.5, alignSelf: "center" }}>
          {trophies.length} trophy{trophies.length !== 1 ? "s" : ""}
        </span>
      </section>

      {!busy && trophies.length === 0 ? (
        <section className="card">
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
            <p style={{ margin: 0, opacity: 0.6 }}>
              No trophies yet. Finish in the top 3 at the end of a season to earn one.
            </p>
          </div>
        </section>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {trophies.map((t) => (
          <article
            key={t.trophy_id}
            className="card"
            style={{
              display: "grid",
              gap: 10,
              borderTop: `3px solid ${PLACEMENT_COLOR[t.placement] ?? "#6b7280"}`,
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: 56 }}>{PLACEMENT_ICON[t.placement] ?? "🏆"}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: PLACEMENT_COLOR[t.placement] ?? "#374151" }}>
                {PLACEMENT_LABEL[t.placement] ?? `#${t.placement}`}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>{t.season_title}</div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{t.final_xp.toLocaleString()}</div>
                <div style={{ fontSize: 11, opacity: 0.55 }}>final XP</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>#{t.final_rank}</div>
                <div style={{ fontSize: 11, opacity: 0.55 }}>of {t.total_students}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.45 }}>
              Season ended {new Date(t.season_ends_at).toLocaleDateString()}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
