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

const RARITY_CLASS: Record<Badge["rarity"], string> = {
  common: "badge-rarity-common",
  uncommon: "badge-rarity-uncommon",
  rare: "badge-rarity-rare",
  legendary: "badge-rarity-legendary"
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
      // Keep partial data on modal when detail fetch fails.
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const categories = ["all", ...Array.from(new Set(badges.map((b) => b.category))).sort()];
  const filtered = badges
    .filter((b) => filterCategory === "all" || b.category === filterCategory)
    .filter((b) => filterStatus === "all" || (filterStatus === "earned" ? b.earned : !b.earned));

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="grid gap-14">
      <PageTitle title="Badge Wall" subtitle="Every badge you can earn — collect them all" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}

      <section className="card row-14-wrap">
        <div>
          <div className="badges-earned-score">
            {earnedCount}<span className="badges-earned-total">/{badges.length}</span>
          </div>
          <div className="badges-earned-label">badges earned</div>
        </div>
        <button className="secondary ml-auto align-self-center" onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>
      </section>

      <section className="card row-6-wrap">
        {categories.map((c) => (
          <button key={c} className={filterCategory === c ? "" : "secondary"} onClick={() => setFilterCategory(c)}>
            {c === "all" ? "All" : c}
          </button>
        ))}
        <div className="row-6 ml-auto">
          {(["all", "earned", "locked"] as const).map((s) => (
            <button key={s} className={filterStatus === s ? "" : "secondary"} onClick={() => setFilterStatus(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <div className="badge-grid">
        {filtered.map((b) => (
          <button
            key={b.badge_id}
            onClick={() => void openBadge(b)}
            className={`badge-tile ${RARITY_CLASS[b.rarity]}${b.earned ? " is-earned" : " is-locked"}`}
          >
            <div className="badge-icon">{b.icon || "🏅"}</div>
            <div className="badge-name">{b.name}</div>
            <div className="badge-category">{b.category}</div>
            <div className="badge-rarity-pill">{b.rarity}</div>
            {b.earned ? (
              <div className="badge-earned">✓ Earned</div>
            ) : (
              <div className="badge-locked">🔒 Locked</div>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && !busy ? (
        <section className="card"><p className="m-0 text-muted-60">No badges match your filters.</p></section>
      ) : null}

      {selected ? (
        <div className="badge-modal-overlay" onClick={() => setSelected(null)}>
          <div className="badge-modal" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="badge-modal-icon">{selected.icon || "🏅"}</div>
              <h2 className="badges-modal-title">{selected.name}</h2>
              <div className={`badge-rarity-pill badge-modal-rarity ${RARITY_CLASS[selected.rarity]}`}>
                {selected.rarity} · {selected.category}
              </div>
            </div>

            <p className="m-0">{selected.description}</p>

            <div className="badges-unlock-box">
              <div className="kicker mb-4">How to unlock</div>
              <p className="m-0 fs-14">{selected.criteria}</p>
            </div>

            {selected.earned ? (
              <div className="badge-earned">✓ You earned this on {new Date(selected.earned_at!).toLocaleDateString()}</div>
            ) : (
              <div className="badge-locked">🔒 Not yet earned</div>
            )}

            <div>
              <div className="kicker mb-6">
                {loadingDetail ? "Loading earners..." : `${selected.earner_count ?? 0} classmate${(selected.earner_count ?? 0) !== 1 ? "s" : ""} earned this`}
              </div>

              {(selected.earners ?? []).length > 0 ? (
                <div className="row-6-wrap">
                  {selected.earners!.map((e) => (
                    <span key={e.email} className="pill fs-12">{e.name ?? e.email}</span>
                  ))}
                </div>
              ) : !loadingDetail ? (
                <p className="m-0 text-muted-50 fs-13">No classmates have earned this yet.</p>
              ) : null}
            </div>

            <button className="secondary" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
