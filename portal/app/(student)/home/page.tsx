"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface HomeFeedAction {
  kind: string;
  title: string;
  subtitle: string;
  href: string;
  priority: number;
}

interface HomeFeedEvent {
  event_id: string;
  title: string;
  track: string;
  module: string;
  open_at: string;
  close_at: string;
  already_submitted: boolean;
}

interface HomeFeedPayload {
  ok: boolean;
  data: {
    season: {
      season_id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      status: string;
    } | null;
    quick_actions: HomeFeedAction[];
    active_events: HomeFeedEvent[];
    pod: {
      pod_id: string;
      pod_name: string;
      rank: number;
      points: number;
      members: Array<{ email: string; display_name: string }>;
    } | null;
    my_standing: {
      rank: number;
      points: number;
    } | null;
    rewards: {
      streak_days: number;
      recent_points: Array<{
        ts: string;
        delta_points: number;
        reason: string;
      }>;
    };
  };
}

export default function StudentHomeFeedPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<HomeFeedPayload | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<HomeFeedPayload>("/api/me/home-feed");
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load home feed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const d = payload?.data;

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Daily Home"
        subtitle="Your next 3 best actions, live competition, and team momentum"
      />

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh home feed"}
        </button>
        <span className="pill">Private cohort mode</span>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="grid grid-2">
        <article className="card">
          <div className="kicker">Active Season</div>
          <h2 style={{ margin: "8px 0" }}>{d?.season?.title || "No active season"}</h2>
          {d?.season ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Ends: {d.season.ends_at ? new Date(d.season.ends_at).toLocaleString() : "TBD"}
            </p>
          ) : null}
        </article>
        <article className="card">
          <div className="kicker">League Rank</div>
          <h2 style={{ margin: "8px 0" }}>
            {d?.my_standing?.rank ? `#${d.my_standing.rank}` : "Not ranked yet"}
          </h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Points: {d?.my_standing?.points ?? 0} | Streak: {d?.rewards?.streak_days ?? 0} days
          </p>
        </article>
      </section>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Your 3 Next Actions</h2>
        {(d?.quick_actions || []).length ? (
          <div className="grid grid-2">
            {(d?.quick_actions || []).map((action, idx) => (
              <article key={`${action.kind}-${idx}`} className="card" style={{ padding: 12 }}>
                <div className="pill">{action.kind}</div>
                <div style={{ marginTop: 8, fontWeight: 700 }}>{action.title}</div>
                <p style={{ margin: "6px 0 10px", color: "var(--muted)" }}>{action.subtitle}</p>
                <a href={action.href}>Open</a>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0 }}>No recommended actions yet.</p>
        )}
      </section>

      <section className="grid grid-2">
        <article className="card" style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Live Events</h2>
          {(d?.active_events || []).length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {(d?.active_events || []).slice(0, 3).map((event) => (
                <div key={event.event_id} className="card" style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>{event.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>
                    Track {event.track} | Module {event.module || "Any"}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {event.already_submitted ? <span className="pill">Submitted</span> : <span className="pill">Open</span>}
                  </div>
                </div>
              ))}
              <Link href="/events">Open all events</Link>
            </div>
          ) : (
            <p style={{ margin: 0 }}>No active events right now.</p>
          )}
        </article>

        <article className="card" style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Your Pod</h2>
          {d?.pod ? (
            <>
              <div>
                <strong>{d.pod.pod_name}</strong>
              </div>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>
                Rank #{d.pod.rank || "-"} | {d.pod.points || 0} points
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {(d.pod.members || []).slice(0, 5).map((m) => (
                  <div key={m.email}>{m.display_name || m.email}</div>
                ))}
              </div>
              <Link href="/pods">Open pod page</Link>
            </>
          ) : (
            <p style={{ margin: 0 }}>You are not assigned to a pod yet.</p>
          )}
        </article>
      </section>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Recent Reward Activity</h2>
        {(d?.rewards?.recent_points || []).length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Points</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {(d?.rewards?.recent_points || []).slice(0, 8).map((row, idx) => (
                  <tr key={`${row.ts}-${idx}`}>
                    <td>{new Date(row.ts).toLocaleString()}</td>
                    <td>{row.delta_points}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ margin: 0 }}>No recent reward entries yet.</p>
        )}
      </section>
    </div>
  );
}
