"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface CheckinStatus {
  ok: boolean;
  data: {
    streak_days: number;
    checked_in_today: boolean;
    last_checkin?: string;
    xp_per_checkin: number;
  };
}

export default function CheckinPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CheckinStatus["data"] | null>(null);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<CheckinStatus>("/api/me/checkin");
      setStatus(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load check-in status");
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<CheckinStatus>("/api/me/checkin", { method: "POST" });
      setStatus(res.data);
      setJustCheckedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const alreadyDone = status?.checked_in_today ?? false;

  return (
    <div className="grid gap-14">
      <PageTitle
        title="Daily Check-In"
        subtitle="Check in once a day to grow your streak and earn bonus XP"
      />

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {justCheckedIn ? (
        <section className="card">
          <div className="banner">
            Checked in! +{status?.xp_per_checkin ?? 0} XP earned. Keep the streak alive.
          </div>
        </section>
      ) : null}

      <section className="grid grid-2">
        <article className="card" style={{ textAlign: "center" }}>
          <div className="kicker">Current Streak</div>
          <h2 style={{ margin: "8px 0", fontSize: 48 }}>
            {status?.streak_days ?? 0}
          </h2>
          <div style={{ opacity: 0.65, fontSize: 14 }}>consecutive days</div>
        </article>
        <article className="card" style={{ textAlign: "center" }}>
          <div className="kicker">XP Per Check-In</div>
          <h2 style={{ margin: "8px 0", fontSize: 48 }}>
            +{status?.xp_per_checkin ?? 0}
          </h2>
          <div style={{ opacity: 0.65, fontSize: 14 }}>XP rewarded each day</div>
        </article>
      </section>

      {status?.last_checkin ? (
        <section className="card">
          <div className="kicker">Last Check-In</div>
          <div style={{ marginTop: 4 }}>
            {new Date(status.last_checkin).toLocaleString()}
          </div>
        </section>
      ) : null}

      <section className="card">
        {alreadyDone ? (
          <div className="banner">
            You already checked in today. Come back tomorrow to keep your streak going!
          </div>
        ) : (
          <button onClick={() => void checkIn()} disabled={busy} style={{ fontSize: 18, padding: "12px 24px" }}>
            {busy ? "Checking in..." : "Check In Today"}
          </button>
        )}
      </section>
    </div>
  );
}
