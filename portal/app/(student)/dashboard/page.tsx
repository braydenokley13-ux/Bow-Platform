"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/page-title";
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
    quick_actions?: Array<{
      title: string;
      href: string;
    }>;
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    void load();
  }, []);

  const user = payload?.data.user;
  const trackCards = useMemo(() => {
    const map = payload?.data.xp_by_track || {};
    return Object.entries(map).map(([track, xp]) => ({ track, xp }));
  }, [payload]);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Dashboard" subtitle="Your performance, raffle status, and recent updates" />

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh dashboard"}
        </button>
        {busy ? <span className="pill">Loading latest data...</span> : null}
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">
            <strong>Dashboard load failed:</strong> {error}
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={() => void load()} className="secondary">
              Retry
            </button>
          </div>
        </section>
      ) : null}

      {busy && !payload ? (
        <section className="grid grid-2">
          <article className="card">
            <div className="skeleton sk-line" style={{ width: "40%" }} />
            <div className="skeleton sk-title" />
            <div className="skeleton sk-line" style={{ width: "70%" }} />
          </article>
          <article className="card">
            <div className="skeleton sk-line" style={{ width: "40%" }} />
            <div className="skeleton sk-title" />
            <div className="skeleton sk-line" style={{ width: "70%" }} />
          </article>
        </section>
      ) : null}

      {user ? (
        <section className="grid grid-2">
          <article className="card">
            <div className="kicker">Student</div>
            <h2 style={{ margin: "6px 0" }}>{user.display_name || user.email}</h2>
            <div className="pill">{user.email}</div>
          </article>
          <article className="card">
            <div className="kicker">Level</div>
            <h2 style={{ margin: "6px 0" }}>
              {user.level} {user.level_title ? `· ${user.level_title}` : ""}
            </h2>
            <div className="pill">Streak: {user.streak_days} days</div>
          </article>
        </section>
      ) : null}

      <section className="grid grid-2">
        <article className="card">
          <div className="kicker">Total XP</div>
          <h2 style={{ margin: "8px 0" }}>{user?.xp ?? 0}</h2>
        </article>
        <article className="card">
          <div className="kicker">Raffle Tickets Available</div>
          <h2 style={{ margin: "8px 0" }}>{payload?.data.raffle_tickets.available ?? 0}</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
            {payload?.data.raffle_tickets.formula || ""}
          </p>
        </article>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <div className="kicker">Season</div>
          <h2 style={{ margin: "8px 0" }}>{payload?.data.season?.title || "No active season"}</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
            {payload?.data.season?.status || "-"}
          </p>
        </article>
        <article className="card">
          <div className="kicker">League Rank</div>
          <h2 style={{ margin: "8px 0" }}>
            {payload?.data.league?.individual_rank ? `#${payload?.data.league?.individual_rank}` : "Not ranked"}
          </h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
            Points: {payload?.data.league?.individual_points ?? 0}
          </p>
        </article>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Quick Actions</h2>
        {(payload?.data.quick_actions || []).length ? (
          <div className="grid grid-2">
            {(payload?.data.quick_actions || []).map((action, idx) => (
              <article key={`${action.href}-${idx}`} className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700 }}>{action.title}</div>
                <div style={{ marginTop: 8 }}>
                  <a href={action.href}>Open</a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0 }}>No quick actions right now.</p>
        )}
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>XP by Track</h2>
        <div className="grid grid-2">
          {trackCards.map((row) => (
            <article key={row.track} className="card" style={{ padding: 12 }}>
              <div className="kicker">Track {row.track}</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{row.xp}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Active Raffle</h2>
        {payload?.data.raffle ? (
          <>
            <div className="pill">{payload.data.raffle.status}</div>
            <div>
              <strong>{payload.data.raffle.title}</strong>
            </div>
            <div>Prize: {payload.data.raffle.prize}</div>
            <div>Raffle ID: {payload.data.raffle.raffle_id}</div>
          </>
        ) : (
          <p style={{ margin: 0 }}>No active raffle right now.</p>
        )}
      </section>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Recent Notifications</h2>
        {(payload?.data.notifications || []).length ? (
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
                {(payload?.data.notifications || []).map((n) => (
                  <tr key={n.notification_id}>
                    <td>{new Date(n.created_at).toLocaleString()}</td>
                    <td>{n.kind}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{n.title}</div>
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>{n.body}</div>
                    </td>
                    <td>{n.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ margin: 0 }}>No notifications yet.</p>
        )}
      </section>
    </div>
  );
}
