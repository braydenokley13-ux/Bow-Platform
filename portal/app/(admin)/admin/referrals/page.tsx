"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ReferralCode {
  referral_code: string;
  email: string;
  created_at: string;
  uses_count: number;
}

interface Redemption {
  redemption_id: string;
  referral_code: string;
  referrer_email: string;
  referred_email: string;
  redeemed_at: string;
  xp_awarded: number;
}

interface ActivityPayload {
  ok: boolean;
  data: {
    referral_codes: ReferralCode[];
    referral_redemptions: Redemption[];
  };
}

export default function AdminReferralsPage() {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [refCode, setRefCode] = useState("");
  const [refEmail, setRefEmail] = useState("");
  const [xpAmount, setXpAmount] = useState("500");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<ActivityPayload>("/api/admin/referrals/activity");
      setCodes(Array.isArray(json.data?.referral_codes) ? json.data.referral_codes : []);
      setRedemptions(Array.isArray(json.data?.referral_redemptions) ? json.data.referral_redemptions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referral data");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onRedeem(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/admin/referrals/redeem", {
        method: "POST",
        json: {
          referral_code: refCode.trim(),
          referred_email: refEmail.trim().toLowerCase(),
          xp_amount: Number(xpAmount)
        }
      });
      setMessage("Referral redeemed — XP awarded to referrer.");
      setRefCode("");
      setRefEmail("");
      setXpAmount("500");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to redeem referral");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Referral System" subtitle="Redeem referral codes and award XP bonuses to students who recruited friends" />

      <form className="card" onSubmit={(e) => void onRedeem(e)} style={{ display: "grid", gap: 10, maxWidth: 560 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Redeem a referral</div>
        <div className="grid grid-2">
          <label>
            Referral code
            <input
              value={refCode}
              onChange={(e) => setRefCode(e.target.value)}
              placeholder="REF_XXXXXXXXXXXXXX"
              required
            />
          </label>
          <label>
            Referred student email
            <input
              type="email"
              value={refEmail}
              onChange={(e) => setRefEmail(e.target.value)}
              placeholder="newstudent@example.com"
              required
            />
          </label>
        </div>
        <label style={{ maxWidth: 200 }}>
          XP bonus to award
          <input
            type="number"
            min={0}
            value={xpAmount}
            onChange={(e) => setXpAmount(e.target.value)}
          />
        </label>
        <button disabled={saving}>{saving ? "Redeeming..." : "Redeem referral"}</button>
      </form>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {message ? <div className="banner banner-success">{message}</div> : null}

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh data"}
        </button>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {codes.length} referral link(s) generated · {redemptions.length} redeemed
        </span>
      </section>

      <section className="card table-wrap">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Referral links</div>
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Code</th>
              <th>Uses</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((row) => (
              <tr key={row.referral_code}>
                <td>{row.email}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{row.referral_code}</td>
                <td>{row.uses_count}</td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>{row.created_at}</td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center" }}>
                  No referral links yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card table-wrap">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Redemptions</div>
        <table>
          <thead>
            <tr>
              <th>Referrer</th>
              <th>Referred</th>
              <th>XP Awarded</th>
              <th>Redeemed At</th>
            </tr>
          </thead>
          <tbody>
            {redemptions.map((row) => (
              <tr key={row.redemption_id}>
                <td>{row.referrer_email}</td>
                <td>{row.referred_email}</td>
                <td style={{ fontWeight: 700 }}>+{row.xp_awarded} XP</td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>{row.redeemed_at}</td>
              </tr>
            ))}
            {redemptions.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center" }}>
                  No redemptions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
