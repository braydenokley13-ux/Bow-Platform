"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ReferralData {
  referral_code: string;
  uses_count: number;
  created_at: string;
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<{ ok: boolean; data: ReferralData }>("/api/referrals");
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referral link");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function getReferralUrl() {
    if (!data) return "";
    return `${window.location.origin}/activate?ref=${data.referral_code}`;
  }

  async function copyLink() {
    const url = getReferralUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle
        title="Refer a Friend"
        subtitle="Share your personal invite link — earn a big XP bonus when they enroll"
      />

      {error ? <div className="banner banner-error">{error}</div> : null}

      {busy ? (
        <div className="card" style={{ color: "var(--muted)" }}>
          Generating your referral link...
        </div>
      ) : data ? (
        <>
          <section className="card stack-12">
            <div style={{ fontWeight: 700, fontSize: 15 }}>Your referral link</div>
            <div
              style={{
                background: "var(--surface-alt, #111)",
                borderRadius: 6,
                padding: "10px 14px",
                fontFamily: "monospace",
                fontSize: 13,
                wordBreak: "break-all",
                color: "var(--fg)"
              }}
            >
              {getReferralUrl()}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => void copyLink()}>
                {copied ? "Copied!" : "Copy link"}
              </button>
              <button onClick={() => void load()} disabled={busy} style={{ opacity: 0.7 }}>
                Refresh
              </button>
            </div>
          </section>

          <section className="card stack-8">
            <div style={{ fontWeight: 700, fontSize: 15 }}>How it works</div>
            <ol style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 6, color: "var(--muted)", fontSize: 14 }}>
              <li>Share your link with a friend who might join a future BOW cohort.</li>
              <li>When they enroll and activate their account, the admin records the referral.</li>
              <li>You automatically earn a large XP bonus credited to your account.</li>
            </ol>
          </section>

          <section className="card row-24-wrap">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{data.uses_count}</div>
              <div className="muted-12">Successful referrals</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{data.uses_count * 500}</div>
              <div className="muted-12">XP earned via referrals</div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
