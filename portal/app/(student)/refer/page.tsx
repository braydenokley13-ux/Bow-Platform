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

const STATUS_COLOR: Record<string, string> = {
  pending: "#c45c00",
  enrolled: "#0d7a4f",
  rewarded: "#1e4fb4",
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
      // fallback: show in prompt
      prompt("Copy your referral link:", payload.data.referral_url);
    }
  }

  useEffect(() => { void load(); }, []);

  const data = payload?.data;

  return (
    <div className="grid gap-20">
      <PageTitle
        title="Refer a Friend"
        subtitle="Invite friends to a future BOW cohort. Earn XP when they enroll."
      />

      {error && <div className="banner banner-error"><strong>Error:</strong> {error}</div>}

      {/* Referral Link Card */}
      <section className="card stack-14">
        <div>
          <div className="kicker">Your Personal Referral Link</div>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 14 }}>
            Share this link with friends who might join a future BOW cohort.
            When they enroll, you automatically earn{" "}
            <strong style={{ color: "var(--brand)" }}>
              {data ? `${data.xp_bonus_on_enroll.toLocaleString()} XP` : "a large XP bonus"}
            </strong>.
          </p>
        </div>

        {data ? (
          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                background: "var(--surface-soft)",
                border: "1.5px solid var(--border)",
                borderRadius: 8,
                padding: "10px 14px",
                fontFamily: "monospace",
                fontSize: 14,
                wordBreak: "break-all",
                color: "var(--text)",
              }}
            >
              {data.referral_url}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => void copyLink()}>
                {copied ? "✓ Copied!" : "Copy Link"}
              </button>
              <span className="pill" style={{ fontSize: 12, color: "var(--muted)" }}>
                Code: <strong>{data.referral_code}</strong>
              </span>
            </div>
          </div>
        ) : busy ? (
          <div className="skeleton sk-line" style={{ width: "70%" }} />
        ) : null}
      </section>

      {/* Stats */}
      {data && (
        <section className="card row-20-wrap">
          <div style={{ textAlign: "center" }}>
            <div className="kicker">Total Referrals</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "var(--brand)" }}>
              {data.referrals.length}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="kicker">Enrolled</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#0d7a4f" }}>
              {data.referrals.filter((r) => r.status === "enrolled" || r.status === "rewarded").length}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="kicker">XP Earned from Referrals</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#1e4fb4" }}>
              {data.total_xp_earned.toLocaleString()}
            </div>
          </div>
        </section>
      )}

      {/* Referral History */}
      <section className="card stack-12">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 className="title-18">Your Referrals</h2>
          <button onClick={() => void load()} disabled={busy} className="secondary" style={{ marginLeft: "auto", fontSize: 13, padding: "4px 10px" }}>
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>

        {!data || data.referrals.length === 0 ? (
          <p className="m-0 text-muted">
            No referrals yet. Share your link to get started!
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table-inline">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["Friend", "Status", "XP Earned", "Date"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r) => (
                  <tr key={r.referral_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 8px", fontWeight: 600 }}>{r.referred_name || r.referred_email}</td>
                    <td style={{ padding: "8px 8px" }}>
                      <span className="pill" style={{ color: STATUS_COLOR[r.status] ?? "var(--muted)", borderColor: (STATUS_COLOR[r.status] ?? "var(--border)") + "55" }}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: "8px 8px", fontWeight: r.xp_awarded > 0 ? 700 : 400, color: r.xp_awarded > 0 ? "#1e4fb4" : "var(--muted)" }}>
                      {r.xp_awarded > 0 ? `+${r.xp_awarded.toLocaleString()} XP` : "—"}
                    </td>
                    <td style={{ padding: "8px 8px", color: "var(--muted)", fontSize: 13 }}>
                      {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="card stack-10">
        <h2 className="title-16">How It Works</h2>
        <ol style={{ margin: 0, paddingLeft: 20, color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
          <li>Copy your unique referral link above.</li>
          <li>Share it with friends interested in BOW Sports Capital programs.</li>
          <li>When your friend enrolls in a future cohort using your link, you earn <strong>{data ? `${data.xp_bonus_on_enroll.toLocaleString()} XP` : "a bonus"}</strong> automatically.</li>
          <li>XP appears in your account once the enrollment is confirmed by admin.</li>
        </ol>
      </section>
    </div>
  );
}
