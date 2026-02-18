"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { PageSection } from "@/components/page-section";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { ActionBar } from "@/components/action-bar";
import { EmptyState } from "@/components/empty-state";
import { FeedbackBanner } from "@/components/feedback-banner";
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
    <div className="grid gap-14">
      <PageTitle title="Daily Home" subtitle="Your next 3 best actions, live competition, and team momentum" />

      <PageSection
        actions={
          <ActionBar>
            <button onClick={() => void load()} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh home feed"}
            </button>
            <span className="pill">Private cohort mode</span>
          </ActionBar>
        }
      >
        <p className="m-0 text-muted">Start here each day for your highest-value next actions.</p>
      </PageSection>

      {error ? <FeedbackBanner kind="error">{error}</FeedbackBanner> : null}

      <div className="grid grid-2">
        <StatCard
          label="Active Season"
          value={d?.season?.title || "No active season"}
          hint={d?.season ? `Ends: ${d.season.ends_at ? new Date(d.season.ends_at).toLocaleString() : "TBD"}` : ""}
          accent="brand"
        />
        <StatCard
          label="League Rank"
          value={d?.my_standing?.rank ? `#${d.my_standing.rank}` : "Not ranked yet"}
          hint={`Points: ${d?.my_standing?.points ?? 0} | Streak: ${d?.rewards?.streak_days ?? 0} days`}
          accent="info"
        />
      </div>

      <PageSection title="Your 3 Next Actions">
        {(d?.quick_actions || []).length ? (
          <div className="grid grid-2">
            {(d?.quick_actions || []).map((action, idx) => (
              <article key={`${action.kind}-${idx}`} className="card p-12 stack-8">
                <div className="pill">{action.kind}</div>
                <div className="fw-700">{action.title}</div>
                <p className="m-0 text-muted">{action.subtitle}</p>
                <a href={action.href}>Open</a>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No recommended actions" body="No recommended actions yet." />
        )}
      </PageSection>

      <div className="grid grid-2">
        <PageSection title="Live Events">
          {(d?.active_events || []).length ? (
            <div className="stack-8">
              {(d?.active_events || []).slice(0, 3).map((event) => (
                <div key={event.event_id} className="card p-12 stack-6">
                  <div className="fw-700">{event.title}</div>
                  <div className="muted-13">
                    Track {event.track} | Module {event.module || "Any"}
                  </div>
                  <div>
                    {event.already_submitted ? <span className="pill">Submitted</span> : <span className="pill">Open</span>}
                  </div>
                </div>
              ))}
              <Link href="/events">Open all events</Link>
            </div>
          ) : (
            <EmptyState title="No active events" body="No active events right now." />
          )}
        </PageSection>

        <PageSection title="Your Pod">
          {d?.pod ? (
            <div className="stack-8">
              <div>
                <strong>{d.pod.pod_name}</strong>
              </div>
              <div className="muted-13">Rank #{d.pod.rank || "-"} | {d.pod.points || 0} points</div>
              <div className="stack-4">
                {(d.pod.members || []).slice(0, 5).map((m) => (
                  <div key={m.email}>{m.display_name || m.email}</div>
                ))}
              </div>
              <Link href="/pods">Open pod page</Link>
            </div>
          ) : (
            <EmptyState title="No pod assignment" body="You are not assigned to a pod yet." />
          )}
        </PageSection>
      </div>

      <PageSection title="Recent Reward Activity">
        {(d?.rewards?.recent_points || []).length ? (
          <DataTable headers={["When", "Points", "Reason"]}>
            {(d?.rewards?.recent_points || []).slice(0, 8).map((row, idx) => (
              <tr key={`${row.ts}-${idx}`}>
                <td>{new Date(row.ts).toLocaleString()}</td>
                <td>{row.delta_points}</td>
                <td>{row.reason}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No reward entries" body="No recent reward entries yet." />
        )}
      </PageSection>
    </div>
  );
}
