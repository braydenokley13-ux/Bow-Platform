"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { PageSection } from "@/components/page-section";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { ActionBar } from "@/components/action-bar";
import { EmptyState } from "@/components/empty-state";
import { FeedbackBanner } from "@/components/feedback-banner";
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
    <div className="grid gap-14">
      <PageTitle title="Dashboard" subtitle="Your performance, raffle status, and recent updates" />

      <PageSection
        actions={
          <ActionBar>
            <button onClick={() => void load()} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh dashboard"}
            </button>
            {busy ? <span className="pill">Loading latest data...</span> : null}
          </ActionBar>
        }
      >
        <p className="m-0 text-muted">Live snapshot from student APIs.</p>
      </PageSection>

      {error ? <FeedbackBanner kind="error">Dashboard load failed: {error}</FeedbackBanner> : null}

      {busy && !payload ? (
        <div className="grid grid-2">
          <LoadingSkeleton lines={3} />
          <LoadingSkeleton lines={3} />
        </div>
      ) : null}

      {user ? (
        <div className="grid grid-2">
          <StatCard
            label="Student"
            value={user.display_name || user.email}
            hint={user.email}
            accent="brand"
          />
          <StatCard
            label="Level"
            value={`${user.level}${user.level_title ? ` · ${user.level_title}` : ""}`}
            hint={`Streak: ${user.streak_days} days`}
            accent="info"
          />
        </div>
      ) : null}

      <div className="grid grid-2">
        <StatCard label="Total XP" value={user?.xp ?? 0} accent="success" />
        <StatCard
          label="Raffle Tickets Available"
          value={payload?.data.raffle_tickets.available ?? 0}
          hint={payload?.data.raffle_tickets.formula || ""}
          accent="brand"
        />
      </div>

      <div className="grid grid-2">
        <StatCard
          label="Season"
          value={payload?.data.season?.title || "No active season"}
          hint={payload?.data.season?.status || "-"}
          accent="info"
        />
        <StatCard
          label="League Rank"
          value={
            payload?.data.league?.individual_rank
              ? `#${payload?.data.league?.individual_rank}`
              : "Not ranked"
          }
          hint={`Points: ${payload?.data.league?.individual_points ?? 0}`}
          accent="brand"
        />
      </div>

      <PageSection title="Quick Actions">
        {(payload?.data.quick_actions || []).length ? (
          <div className="grid grid-2">
            {(payload?.data.quick_actions || []).map((action, idx) => (
              <article key={`${action.href}-${idx}`} className="card p-12">
                <div className="fw-700">{action.title}</div>
                <div className="row-8" style={{ marginTop: 8 }}>
                  <a href={action.href}>Open</a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No quick actions" body="No quick actions right now." />
        )}
      </PageSection>

      <PageSection title="XP by Track">
        <div className="grid grid-2">
          {trackCards.map((row) => (
            <StatCard key={row.track} label={`Track ${row.track}`} value={row.xp} accent="info" />
          ))}
        </div>
      </PageSection>

      <PageSection title="Active Raffle">
        {payload?.data.raffle ? (
          <div className="stack-8">
            <div className="pill">{payload.data.raffle.status}</div>
            <div>
              <strong>{payload.data.raffle.title}</strong>
            </div>
            <div>Prize: {payload.data.raffle.prize}</div>
            <div>Raffle ID: {payload.data.raffle.raffle_id}</div>
          </div>
        ) : (
          <EmptyState title="No active raffle" body="No active raffle right now." />
        )}
      </PageSection>

      <PageSection title="Recent Notifications">
        {(payload?.data.notifications || []).length ? (
          <DataTable headers={["When", "Kind", "Title", "Status"]} stickyHeader>
            {(payload?.data.notifications || []).map((n) => (
              <tr key={n.notification_id}>
                <td>{new Date(n.created_at).toLocaleString()}</td>
                <td>{n.kind}</td>
                <td>
                  <div className="fw-700">{n.title}</div>
                  <div className="muted-13">{n.body}</div>
                </td>
                <td>{n.status}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No notifications" body="No notifications yet." />
        )}
      </PageSection>
    </div>
  );
}
