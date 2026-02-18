"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

interface DashboardPayload {
  ok: boolean;
  data: {
    user: {
      email: string;
      display_name: string;
      xp: number;
      level: number;
      streak_days: number;
      level_title: string;
    };
    xp_by_track: Record<string, number>;
    raffle: {
      raffle_id: string;
      title: string;
      prize: string;
      status: string;
      closes_at?: string;
    } | null;
    raffle_tickets: {
      earned: number;
      adjustments: number;
      available: number;
      formula: string;
    };
    season?: {
      season_id: string;
      title: string;
      starts_at?: string;
      ends_at?: string;
      status?: string;
    } | null;
    league?: {
      individual_rank: number;
      individual_points: number;
      leaderboard_top: Array<{
        rank: number;
        email: string;
        display_name?: string;
        points: number;
      }>;
    };
    quick_actions?: Array<{ title: string; href: string }>;
    notifications: Array<{
      notification_id: string;
      title: string;
      body: string;
      kind: string;
      status: string;
      created_at: string;
    }>;
  };
}

export default function StudentDashboardPage() {
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [payload, setPayload] = useState<DashboardPayload | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<DashboardPayload>("/api/me/dashboard");
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const user = payload?.data.user;
  const trackCards = useMemo(() => {
    const map = payload?.data.xp_by_track ?? {};
    return Object.entries(map).map(([track, xp]) => ({ track, xp }));
  }, [payload]);

  return (
    <div className="grid gap-5">
      <PageTitle title="Dashboard" subtitle="Your performance, raffle status, and recent updates" />

      <div className="action-bar">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh dashboard"}
        </button>
        {busy && <span className="pill">Loading latest data…</span>}
      </div>

      {error && (
        <div className="banner banner-error">
          <strong>Dashboard load failed:</strong> {error}
          <div style={{ marginTop: 10 }}>
            <button onClick={() => void load()} className="secondary">Retry</button>
          </div>
        </div>
      )}

      {busy && !payload && (
        <section className="grid grid-2">
          <article className="card"><LoadingSkeleton lines={3} /></article>
          <article className="card"><LoadingSkeleton lines={3} /></article>
        </section>
      )}

      {user && (
        <section className="grid grid-2">
          <article className="card">
            <div className="kicker">Student</div>
            <h2 style={{ margin: "6px 0" }}>{user.display_name || user.email}</h2>
            <span className="pill">{user.email}</span>
          </article>
          <article className="card">
            <div className="kicker">Level</div>
            <h2 style={{ margin: "6px 0" }}>
              {user.level}{user.level_title ? ` · ${user.level_title}` : ""}
            </h2>
            <span className="pill">Streak: {user.streak_days} days</span>
          </article>
        </section>
      )}

      <section className="grid grid-2">
        <article className="card">
          <div className="kicker">Total XP</div>
          <h2 style={{ margin: "8px 0" }}>{user?.xp ?? 0}</h2>
        </article>
        <article className="card">
          <div className="kicker">Raffle Tickets Available</div>
          <h2 style={{ margin: "8px 0" }}>{payload?.data.raffle_tickets.available ?? 0}</h2>
          <p className="text-muted text-sm m-0">{payload?.data.raffle_tickets.formula ?? ""}</p>
        </article>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <div className="kicker">Season</div>
          <h2 style={{ margin: "8px 0" }}>{payload?.data.season?.title ?? "No active season"}</h2>
          <p className="text-muted text-sm m-0">{payload?.data.season?.status ?? "—"}</p>
        </article>
        <article className="card">
          <div className="kicker">League Rank</div>
          <h2 style={{ margin: "8px 0" }}>
            {payload?.data.league?.individual_rank ? `#${payload.data.league.individual_rank}` : "Not ranked"}
          </h2>
          <p className="text-muted text-sm m-0">
            Points: {payload?.data.league?.individual_points ?? 0}
          </p>
        </article>
      </section>

      {(payload?.data.quick_actions ?? []).length > 0 && (
        <section className="card grid gap-3">
          <h2 className="section-heading">Quick Actions</h2>
          <div className="grid grid-2">
            {(payload?.data.quick_actions ?? []).map((action, idx) => (
              <article key={`${action.href}-${idx}`} className="card grid gap-2" style={{ padding: 12 }}>
                <p className="fw-bold m-0">{action.title}</p>
                <a href={action.href}>Open →</a>
              </article>
            ))}
          </div>
        </section>
      )}

      {trackCards.length > 0 && (
        <section className="card grid gap-3">
          <h2 className="section-heading">XP by Track</h2>
          <div className="grid grid-2">
            {trackCards.map((row) => (
              <article key={row.track} className="card grid gap-1" style={{ padding: 12 }}>
                <div className="kicker">Track {row.track}</div>
                <div className="fw-bold" style={{ fontSize: 20 }}>{row.xp}</div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="card grid gap-3">
        <h2 className="section-heading">Active Raffle</h2>
        {payload?.data.raffle ? (
          <div className="grid gap-2">
            <span className="pill">{payload.data.raffle.status}</span>
            <p className="fw-bold m-0">{payload.data.raffle.title}</p>
            <p className="text-muted text-sm m-0">Prize: {payload.data.raffle.prize}</p>
          </div>
        ) : (
          <p className="text-muted m-0">No active raffle right now.</p>
        )}
      </section>

      {(payload?.data.notifications ?? []).length > 0 && (
        <section className="card grid gap-3">
          <h2 className="section-heading">Recent Notifications</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Kind</th>
                  <th>Title</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(payload?.data.notifications ?? []).map((n) => (
                  <tr key={n.notification_id}>
                    <td className="text-sm text-muted">{new Date(n.created_at).toLocaleString()}</td>
                    <td><span className="pill">{n.kind}</span></td>
                    <td>
                      <p className="fw-semi m-0">{n.title}</p>
                      <p className="text-muted text-sm m-0">{n.body}</p>
                    </td>
                    <td><span className="pill">{n.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
