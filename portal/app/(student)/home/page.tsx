"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { LoadingSkeleton } from "@/components/loading-skeleton";
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
    my_standing: { rank: number; points: number } | null;
    rewards: {
      streak_days: number;
      recent_points: Array<{ ts: string; delta_points: number; reason: string }>;
    };
  };
}

export default function StudentHomeFeedPage() {
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
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

  useEffect(() => { void load(); }, []);

  const d = payload?.data;

  return (
    <div className="grid gap-5">
      <PageTitle
        title="Daily Home"
        subtitle="Your next best actions, live competition, and team momentum"
      />

      <div className="action-bar">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh home feed"}
        </button>
        <span className="pill">Private cohort mode</span>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {busy && !payload && (
        <section className="card">
          <LoadingSkeleton lines={4} />
        </section>
      )}

      <section className="grid grid-2">
        <article className="card">
          <div className="kicker">Active Season</div>
          <h2 className="m-0" style={{ margin: "8px 0" }}>{d?.season?.title ?? "No active season"}</h2>
          {d?.season && (
            <p className="text-muted m-0">
              Ends: {d.season.ends_at ? new Date(d.season.ends_at).toLocaleString() : "TBD"}
            </p>
          )}
        </article>
        <article className="card">
          <div className="kicker">League Rank</div>
          <h2 style={{ margin: "8px 0" }}>
            {d?.my_standing?.rank ? `#${d.my_standing.rank}` : "Not ranked yet"}
          </h2>
          <p className="text-muted m-0">
            Points: {d?.my_standing?.points ?? 0} | Streak: {d?.rewards?.streak_days ?? 0} days
          </p>
        </article>
      </section>

      <section className="card grid gap-3">
        <h2 className="section-heading">Your Next Actions</h2>
        {(d?.quick_actions ?? []).length ? (
          <div className="grid grid-2">
            {(d?.quick_actions ?? []).map((action, idx) => (
              <article key={`${action.kind}-${idx}`} className="card grid gap-2" style={{ padding: 12 }}>
                <span className="pill">{action.kind}</span>
                <p className="fw-bold m-0">{action.title}</p>
                <p className="text-muted text-sm m-0">{action.subtitle}</p>
                <a href={action.href}>Open →</a>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-muted m-0">No recommended actions yet.</p>
        )}
      </section>

      <section className="grid grid-2">
        <article className="card grid gap-3">
          <h2 className="section-heading">Live Events</h2>
          {(d?.active_events ?? []).length ? (
            <div className="grid gap-2">
              {(d?.active_events ?? []).slice(0, 3).map((event) => (
                <div key={event.event_id} className="card grid gap-1" style={{ padding: 12 }}>
                  <p className="fw-bold m-0">{event.title}</p>
                  <p className="text-muted text-sm m-0">Track {event.track} | Module {event.module || "Any"}</p>
                  <div>
                    {event.already_submitted
                      ? <span className="pill pill-success">Submitted</span>
                      : <span className="pill pill-brand">Open</span>}
                  </div>
                </div>
              ))}
              <Link href="/events">Open all events →</Link>
            </div>
          ) : (
            <p className="text-muted m-0">No active events right now.</p>
          )}
        </article>

        <article className="card grid gap-3">
          <h2 className="section-heading">Your Pod</h2>
          {d?.pod ? (
            <>
              <p className="fw-bold m-0">{d.pod.pod_name}</p>
              <p className="text-muted text-sm m-0">
                Rank #{d.pod.rank || "—"} | {d.pod.points || 0} points
              </p>
              <div className="grid gap-1">
                {(d.pod.members ?? []).slice(0, 5).map((m) => (
                  <div key={m.email} className="text-sm">{m.display_name || m.email}</div>
                ))}
              </div>
              <Link href="/pods">Open pod page →</Link>
            </>
          ) : (
            <p className="text-muted m-0">You are not assigned to a pod yet.</p>
          )}
        </article>
      </section>

      <section className="card grid gap-3">
        <h2 className="section-heading">Recent Reward Activity</h2>
        {(d?.rewards?.recent_points ?? []).length ? (
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
                {(d?.rewards?.recent_points ?? []).slice(0, 8).map((row, idx) => (
                  <tr key={`${row.ts}-${idx}`}>
                    <td className="text-sm text-muted">{new Date(row.ts).toLocaleString()}</td>
                    <td className="fw-semi">{row.delta_points}</td>
                    <td>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted m-0">No recent reward entries yet.</p>
        )}
      </section>
    </div>
  );
}
