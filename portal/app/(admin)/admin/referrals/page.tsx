"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ReferralRow {
  referral_id: string;
  referrer_email: string;
  referrer_name: string;
  referred_email: string;
  referred_name: string;
  status: string;
  xp_awarded: number;
  created_at: string;
}

interface AdminReferralsPayload {
  ok: boolean;
  data: {
    referrals: ReferralRow[];
    total_enrolled: number;
    total_xp_awarded: number;
  };
}

const STATUS_COLOR: Record<string, string> = {
  pending: "#c45c00",
  enrolled: "#0d7a4f",
  rewarded: "#1e4fb4",
};

export default function AdminReferralsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AdminReferralsPayload | null>(null);
  const [awarding, setAwarding] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<AdminReferralsPayload>("/api/admin/referrals");
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  async function awardBonus(referralId: string) {
    if (!confirm("Award referral XP bonus to this student? This will add XP and mark the referral as rewarded.")) return;
    setAwarding(referralId);
    try {
      await apiFetch("/api/admin/referrals", { method: "POST", body: JSON.stringify({ referral_id: referralId }) });
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to award bonus");
    } finally {
      setAwarding(null);
    }
  }

  useEffect(() => { void load(); }, []);

  const referrals = payload?.data.referrals ?? [];

  return (
    <div className="grid gap-20">
      <PageTitle title="Referral Tracking" subtitle="View student referrals and award XP bonuses when friends enroll." />

      {error && <div className="banner banner-error"><strong>Error:</strong> {error}</div>}

      {/* Summary */}
      {payload?.data && (
        <section className="card row-24-wrap">
          <div>
            <div className="kicker">Total Referrals</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--brand)" }}>{referrals.length}</div>
          </div>
          <div>
            <div className="kicker">Enrolled</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0d7a4f" }}>{payload.data.total_enrolled}</div>
          </div>
          <div>
            <div className="kicker">Total XP Awarded</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#1e4fb4" }}>{payload.data.total_xp_awarded.toLocaleString()}</div>
          </div>
          <button onClick={() => void load()} disabled={busy} className="secondary ml-auto" style={{ alignSelf: "center" }}>
            {busy ? "Loading…" : "Refresh"}
          </button>
        </section>
      )}

      {/* Referrals Table */}
      <section className="card stack-12">
        <h2 className="title-18">All Referrals</h2>
        {referrals.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>No referrals recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table-inline">
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {["Referrer", "Referred Friend", "Status", "XP Awarded", "Date", "Action"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "var(--muted)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.referral_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ fontWeight: 600 }}>{r.referrer_name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.referrer_email}</div>
                    </td>
                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ fontWeight: 600 }}>{r.referred_name || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.referred_email}</div>
                    </td>
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
                    <td style={{ padding: "8px 8px" }}>
                      {r.status === "enrolled" ? (
                        <button
                          onClick={() => void awardBonus(r.referral_id)}
                          disabled={awarding === r.referral_id}
                          style={{ fontSize: 12, padding: "4px 10px" }}
                        >
                          {awarding === r.referral_id ? "…" : "Award XP Bonus"}
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--muted)" }}>
                          {r.status === "rewarded" ? "✓ Rewarded" : "Awaiting enrollment"}
                        </span>
                      )}
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
