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

const CATEGORY_CLASS: Record<string, string> = {
  recognition: "rewards-accent-blue",
  content: "rewards-accent-green",
  custom: "rewards-accent-purple",
  social: "rewards-accent-orange"
};

const REDEMPTION_STATUS_CLASS: Record<string, string> = {
  fulfilled: "pill-status-positive",
  pending: "pill-status-pending"
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
        body: JSON.stringify({ reward_id: rewardId })
      });
      setRedeemMsg({ id: rewardId, ok: true, text: "Redeemed! Admin will fulfill your reward shortly." });
      void load();
    } catch (err) {
      setRedeemMsg({ id: rewardId, ok: false, text: err instanceof Error ? err.message : "Redemption failed" });
    } finally {
      setRedeeming(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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
          <button onClick={() => void load()} className="secondary ml-10">Retry</button>
        </div>
      )}

      <section className="card row-16-center-wrap">
        <div>
          <div className="kicker">Available Balance</div>
          <div className="rewards-balance-value">
            {myXp.toLocaleString()} <span className="rewards-balance-suffix">XP</span>
          </div>
        </div>
        <button onClick={() => void load()} disabled={busy} className="secondary ml-auto">
          {busy ? "Loading..." : "Refresh"}
        </button>
      </section>

      <section className="card stack-14">
        <h2 className="title-18">Available Rewards</h2>
        {busy && !payload ? (
          <div className="grid grid-2 gap-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card stack-8">
                <div className="skeleton sk-line w-60" />
                <div className="skeleton sk-title w-80" />
                <div className="skeleton sk-line w-40" />
              </div>
            ))}
          </div>
        ) : catalog.length === 0 ? (
          <p className="m-0 text-muted">No rewards available right now. Check back soon!</p>
        ) : (
          <div className="grid grid-2 gap-12">
            {catalog.map((item) => {
              const accentClass = CATEGORY_CLASS[item.category] ?? "rewards-accent-blue";
              const canAfford = myXp >= item.xp_cost;
              const isRedeeming = redeeming === item.reward_id;
              const msg = redeemMsg?.id === item.reward_id ? redeemMsg : null;
              return (
                <article
                  key={item.reward_id}
                  className={`card rewards-card ${accentClass}${item.available ? "" : " rewards-card-disabled"}`}
                >
                  <div className="row-8-center">
                    <span className="rewards-icon">{item.icon || "🎁"}</span>
                    <span className="pill rewards-accent-pill">{item.category}</span>
                    {!item.available && <span className="pill ml-auto fs-11">unavailable</span>}
                  </div>

                  <div>
                    <div className="rewards-title">{item.title}</div>
                    <div className="rewards-description">{item.description}</div>
                  </div>

                  <div className="row-10-center-wrap">
                    <span className="rewards-price">{item.xp_cost.toLocaleString()} XP</span>
                    {item.available && (
                      <button
                        onClick={() => void redeem(item.reward_id, item.xp_cost)}
                        disabled={!canAfford || isRedeeming}
                        title={!canAfford ? `You need ${(item.xp_cost - myXp).toLocaleString()} more XP` : undefined}
                        className="ml-auto"
                      >
                        {isRedeeming ? "Redeeming..." : canAfford ? "Redeem" : "Can't afford"}
                      </button>
                    )}
                  </div>

                  {msg && <div className={`banner${msg.ok ? " banner-success" : " banner-error"} mt-4`}>{msg.text}</div>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card stack-14">
        <h2 className="title-18">Your Redemptions</h2>
        {redemptions.length === 0 ? (
          <p className="m-0 text-muted">You haven&apos;t redeemed anything yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table-inline">
              <thead>
                <tr>
                  <th>Reward</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((r) => (
                  <tr key={r.redemption_id}>
                    <td className="fw-700">{r.reward_title}</td>
                    <td>
                      <span className={`pill ${REDEMPTION_STATUS_CLASS[r.status] ?? "pill-status-muted"}`}>{r.status}</span>
                    </td>
                    <td className="muted-13">
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
