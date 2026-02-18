"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
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
  content: "#0d7a4f",
  custom: "#7b3fa0",
  social: "#c45c00",
};

export default function RewardsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<RewardsPayload | null>(null);
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

  const catalog = payload?.data.catalog ?? [];
  const myXp = payload?.data.my_xp ?? 0;
  const redemptions = payload?.data.my_redemptions ?? [];

  return (
    <div className="grid gap-20">
      <PageTitle
        title="XP Rewards Catalog"
        subtitle="Spend your XP on exclusive rewards. Admin fulfills each redemption."
      />

      {error && (
        <div className="banner banner-error">
          <strong>Error:</strong> {error}
          <button onClick={() => void load()} className="secondary" style={{ marginLeft: 10 }}>Retry</button>
        </div>
      )}

      {/* XP Balance */}
      <section className="card" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="kicker">Available Balance</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--brand)", letterSpacing: "-1px" }}>
            {myXp.toLocaleString()} <span style={{ fontSize: 18, fontWeight: 600 }}>XP</span>
          </div>
        </div>
        <button onClick={() => void load()} disabled={busy} className="secondary ml-auto">
          {busy ? "Loading..." : "Refresh"}
        </button>
      </section>

      {/* Catalog */}
      <section className="card stack-14">
        <h2 className="title-18">Available Rewards</h2>
        {busy && !payload ? (
          <div className="grid grid-2" style={{ gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card stack-8">
                <div className="skeleton sk-line" style={{ width: "60%" }} />
                <div className="skeleton sk-title" style={{ width: "80%" }} />
                <div className="skeleton sk-line" style={{ width: "40%" }} />
              </div>
            ))}
          </div>
        ) : catalog.length === 0 ? (
          <p className="m-0 text-muted">No rewards available right now. Check back soon!</p>
        ) : (
          <div className="grid grid-2" style={{ gap: 12 }}>
            {catalog.map((item) => {
              const accent = CATEGORY_COLORS[item.category] ?? "var(--brand)";
              const canAfford = myXp >= item.xp_cost;
              const isRedeeming = redeeming === item.reward_id;
              const msg = redeemMsg?.id === item.reward_id ? redeemMsg : null;
              return (
                <article
                  key={item.reward_id}
                  className="card"
                  style={{
                    display: "grid",
                    gap: 10,
                    borderTop: `3px solid ${accent}`,
                    opacity: item.available ? 1 : 0.55,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 22 }}>{item.icon || "🎁"}</span>
                    <span className="pill" style={{ borderColor: accent + "55", color: accent, fontSize: 11 }}>
                      {item.category}
                    </span>
                    {!item.available && (
                      <span className="pill" style={{ marginLeft: "auto", fontSize: 11 }}>unavailable</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{item.title}</div>
                    <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 3 }}>{item.description}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: 18, color: accent }}>
                      {item.xp_cost.toLocaleString()} XP
                    </span>
                    {item.available && (
                      <button
                        onClick={() => void redeem(item.reward_id, item.xp_cost)}
                        disabled={!canAfford || isRedeeming}
                        title={!canAfford ? `You need ${(item.xp_cost - myXp).toLocaleString()} more XP` : undefined}
                        className="ml-auto"
                      >
                        {isRedeeming ? "Redeeming…" : canAfford ? "Redeem" : "Can't afford"}
                      </button>
                    )}
                  </div>
                  {msg && (
                    <div className={`banner${msg.ok ? " banner-success" : " banner-error"}`} style={{ marginTop: 4 }}>
                      {msg.text}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* My Redemptions */}
      <section className="card stack-14">
        <h2 className="title-18">Your Redemptions</h2>
        {redemptions.length === 0 ? (
          <p className="m-0 text-muted">You haven&apos;t redeemed anything yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table-inline">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>Reward</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>Status</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.redemption_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 8px", fontWeight: 600 }}>{r.reward_title}</td>
                    <td style={{ padding: "8px 8px" }}>
                      <span className="pill" style={{
                        borderColor: r.status === "fulfilled" ? "#0d7a4f55" : "var(--border)",
                        color: r.status === "fulfilled" ? "#0d7a4f" : "var(--muted)",
                      }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 8px", color: "var(--muted)", fontSize: 13 }}>
                      {new Date(r.redeemed_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
