"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Referral {
  referral_id: string;
  referred_email: string;
  referred_name: string;
  status: string;
  xp_awarded: number;
  created_at: string;
}

interface ReferralPayload {
  ok: boolean;
  data: {
    referral_code: string;
    referral_url: string;
    xp_bonus_on_enroll: number;
    referrals: Referral[];
    total_xp_earned: number;
  };
}

const STATUS_CLASS: Record<string, string> = {
  pending: "pill-status-pending",
  enrolled: "pill-status-positive",
  rewarded: "pill-status-blue"
};

export default function ReferPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ReferralPayload | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<ReferralPayload>("/api/refer");
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referral info");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!payload?.data.referral_url) return;
    try {
      await navigator.clipboard.writeText(payload.data.referral_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt("Copy your referral link:", payload.data.referral_url);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const data = payload?.data;

  return (
    <div className="grid gap-20">
      <PageTitle
        title="Refer a Friend"
        subtitle="Invite friends to a future BOW cohort. Earn XP when they enroll."
      />

      {error && <div className="banner banner-error"><strong>Error:</strong> {error}</div>}

      <section className="card stack-14">
        <div>
          <div className="kicker">Your Personal Referral Link</div>
          <p className="refer-intro-copy">
            Share this link with friends who might join a future BOW cohort. When they enroll, you automatically earn{" "}
            <strong className="text-brand">
              {data ? `${data.xp_bonus_on_enroll.toLocaleString()} XP` : "a large XP bonus"}
            </strong>.
          </p>
        </div>

        {data ? (
          <div className="stack-8">
            <div className="refer-link-box">{data.referral_url}</div>
            <div className="row-8-wrap">
              <button onClick={() => void copyLink()}>{copied ? "✓ Copied!" : "Copy Link"}</button>
              <span className="pill muted-12">
                Code: <strong>{data.referral_code}</strong>
              </span>
            </div>
          </div>
        ) : busy ? (
          <div className="skeleton sk-line w-70" />
        ) : null}
      </section>

      {data && (
        <section className="card row-20-wrap">
          <div className="text-center">
            <div className="kicker">Total Referrals</div>
            <div className="refer-stat-value">{data.referrals.length}</div>
          </div>
          <div className="text-center">
            <div className="kicker">Enrolled</div>
            <div className="refer-stat-value refer-stat-green">
              {data.referrals.filter((r) => r.status === "enrolled" || r.status === "rewarded").length}
            </div>
          </div>
          <div className="text-center">
            <div className="kicker">XP Earned from Referrals</div>
            <div className="refer-stat-value refer-stat-blue">{data.total_xp_earned.toLocaleString()}</div>
          </div>
        </section>
      )}

      <section className="card stack-12">
        <div className="row-10-baseline">
          <h2 className="title-18">Your Referrals</h2>
          <button onClick={() => void load()} disabled={busy} className="secondary ml-auto btn-sm">
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>

        {!data || data.referrals.length === 0 ? (
          <p className="m-0 text-muted">No referrals yet. Share your link to get started!</p>
        ) : (
          <div className="table-wrap">
            <table className="table-inline">
              <thead>
                <tr>
                  {[
                    "Friend",
                    "Status",
                    "XP Earned",
                    "Date"
                  ].map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r) => (
                  <tr key={r.referral_id}>
                    <td className="fw-700">{r.referred_name || r.referred_email}</td>
                    <td>
                      <span className={`pill ${STATUS_CLASS[r.status] ?? "pill-status-muted"}`}>{r.status}</span>
                    </td>
                    <td className={r.xp_awarded > 0 ? "refer-xp-positive" : "refer-xp-muted"}>
                      {r.xp_awarded > 0 ? `+${r.xp_awarded.toLocaleString()} XP` : "—"}
                    </td>
                    <td className="muted-13">
                      {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card stack-10">
        <h2 className="title-16">How It Works</h2>
        <ol className="refer-steps-list">
          <li>Copy your unique referral link above.</li>
          <li>Share it with friends interested in BOW Sports Capital programs.</li>
          <li>When your friend enrolls in a future cohort using your link, you earn <strong>{data ? `${data.xp_bonus_on_enroll.toLocaleString()} XP` : "a bonus"}</strong> automatically.</li>
          <li>XP appears in your account once the enrollment is confirmed by admin.</li>
        </ol>
      </section>
    </div>
  );
}
