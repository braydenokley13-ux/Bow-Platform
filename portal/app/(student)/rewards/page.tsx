"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

interface RewardItem {
  reward_id: string;
  title: string;
  description: string;
  xp_cost: number;
  category: string;
  available: boolean;
  icon: string;
}

interface RewardsPayload {
  ok: boolean;
  data: {
    catalog: RewardItem[];
    my_xp: number;
    my_redemptions: {
      redemption_id: string;
      reward_id: string;
      reward_title: string;
      status: string;
      redeemed_at: string;
    }[];
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  recognition: "#1e4fb4",
  content:     "#0d7a4f",
  custom:      "#7b3fa0",
  social:      "#c45c00",
};

function accentFor(category: string) {
  return CATEGORY_COLORS[category] ?? "var(--color-brand)";
}

export default function RewardsPage() {
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [payload, setPayload]     = useState<RewardsPayload | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [redeemMsg, setRedeemMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<RewardsPayload>("/api/rewards");
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rewards");
    } finally {
      setBusy(false);
    }
  }

  async function redeem(rewardId: string, cost: number) {
    if (!confirm(`Redeem this reward for ${cost.toLocaleString()} XP?`)) return;
    setRedeeming(rewardId);
    setRedeemMsg(null);
    try {
      await apiFetch("/api/rewards/redeem", {
        method: "POST",
        body: JSON.stringify({ reward_id: rewardId }),
      });
      setRedeemMsg({ id: rewardId, ok: true, text: "Redeemed! Admin will fulfill your reward shortly." });
      void load();
    } catch (err) {
      setRedeemMsg({ id: rewardId, ok: false, text: err instanceof Error ? err.message : "Redemption failed" });
    } finally {
      setRedeeming(null);
    }
  }

  useEffect(() => { void load(); }, []);

  const catalog     = payload?.data.catalog ?? [];
  const myXp        = payload?.data.my_xp ?? 0;
  const redemptions = payload?.data.my_redemptions ?? [];

  return (
    <div className="grid gap-5">
      <PageTitle
        title="XP Rewards Catalog"
        subtitle="Spend your XP on exclusive rewards. Admin fulfills each redemption."
      />

      {error && (
        <div className="banner banner-error">
          <strong>Error:</strong> {error}{" "}
          <button onClick={() => void load()} className="secondary" style={{ marginLeft: 10 }}>
            Retry
          </button>
        </div>
      )}

      <section className="card flex items-center flex-wrap gap-4" style={{ padding: "16px 20px" }}>
        <div>
          <div className="kicker">Available Balance</div>
          <div className="xp-balance-amount">
            {myXp.toLocaleString()} <span className="xp-balance-unit">XP</span>
          </div>
        </div>
        <button
          onClick={() => void load()}
          disabled={busy}
          className="secondary"
          style={{ marginLeft: "auto" }}
        >
          {busy ? "Loading…" : "Refresh"}
        </button>
      </section>

      <section className="card grid gap-4">
        <h2 className="section-heading">Available Rewards</h2>

        {busy && !payload ? (
          <div className="grid grid-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card"><LoadingSkeleton lines={3} /></div>
            ))}
          </div>
        ) : catalog.length === 0 ? (
          <div className="empty-state">
            <h3>No rewards yet</h3>
            <p>Check back soon — the catalog will be stocked with goodies.</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {catalog.map((item) => {
              const accent     = accentFor(item.category);
              const canAfford  = myXp >= item.xp_cost;
              const isRedeeming = redeeming === item.reward_id;
              const msg        = redeemMsg?.id === item.reward_id ? redeemMsg : null;
              return (
                <article
                  key={item.reward_id}
                  className="card grid gap-3"
                  style={{
                    borderTop: `3px solid ${accent}`,
                    opacity: item.available ? 1 : 0.55,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="reward-icon">{item.icon || "🎁"}</span>
                    <span className="pill" style={{ borderColor: accent + "55", color: accent, fontSize: 11 }}>
                      {item.category}
                    </span>
                    {!item.available && (
                      <span className="pill" style={{ marginLeft: "auto" }}>unavailable</span>
                    )}
                  </div>
                  <div>
                    <p className="fw-bold m-0">{item.title}</p>
                    <p className="text-muted text-sm m-0">{item.description}</p>
                  </div>
                  <div className="flex items-center flex-wrap gap-3">
                    <span className="reward-cost" style={{ color: accent }}>
                      {item.xp_cost.toLocaleString()} XP
                    </span>
                    {item.available && (
                      <button
                        onClick={() => void redeem(item.reward_id, item.xp_cost)}
                        disabled={!canAfford || isRedeeming}
                        title={!canAfford ? `You need ${(item.xp_cost - myXp).toLocaleString()} more XP` : undefined}
                        style={{ marginLeft: "auto" }}
                      >
                        {isRedeeming ? "Redeeming…" : canAfford ? "Redeem" : "Can't afford"}
                      </button>
                    )}
                  </div>
                  {msg && (
                    <div className={`banner${msg.ok ? " banner-success" : " banner-error"}`}>
                      {msg.text}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card grid gap-4">
        <h2 className="section-heading">Your Redemptions</h2>
        {redemptions.length === 0 ? (
          <p className="text-muted m-0">You haven&apos;t redeemed anything yet.</p>
        ) : (
          <div className="table-wrap">
            <DataTable headers={["Reward", "Status", "Date"]} stickyHeader>
              {redemptions.map((r) => (
                <tr key={r.redemption_id}>
                  <td className="fw-semi">{r.reward_title}</td>
                  <td>
                    <span className={`pill${r.status === "fulfilled" ? " pill-success" : ""}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {new Date(r.redeemed_at).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        )}
      </section>
    </div>
  );
}
