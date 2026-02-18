"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageTitle } from "@/components/page-title";
import { PageSection } from "@/components/page-section";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { ActionBar } from "@/components/action-bar";
import { EmptyState } from "@/components/empty-state";
import { FeedbackBanner } from "@/components/feedback-banner";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

interface OverviewPayload {
  ok: boolean;
  data: {
    student_count: number;
    portal_active_users: number;
    portal_invited_users: number;
    portal_suspended_users: number;
    claims_today: number;
    active_raffle: {
      raffle_id: string;
      title: string;
      prize: string;
      status: string;
    } | null;
    active_raffle_entries: number;
    launch_health: {
      window_hours: number;
      claims_errors: number;
      auth_errors: number;
      action_failures: number;
      support_open: number;
    };
    recent_errors: Array<{ ts: string; event: string; details_json: string }>;
  };
}

interface LaunchReadinessPayload {
  ok: boolean;
  data: {
    overall_status: "READY" | "READY_WITH_WARNINGS" | "NOT_READY";
    checks: Array<{
      id: string;
      label: string;
      status: "PASS" | "WARN" | "FAIL";
      detail: string;
    }>;
  };
}

export default function AdminOverviewPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<OverviewPayload | null>(null);
  const [launchStatus, setLaunchStatus] = useState<LaunchReadinessPayload["data"] | null>(null);

  async function loadEverything() {
    setBusy(true);
    setError(null);
    try {
      const [overviewResult, readinessResult] = await Promise.allSettled([
        apiFetch<OverviewPayload>("/api/admin/overview"),
        apiFetch<LaunchReadinessPayload>("/api/admin/launch-readiness")
      ]);

      if (overviewResult.status === "fulfilled") {
        setPayload(overviewResult.value);
      } else {
        throw overviewResult.reason;
      }

      if (readinessResult.status === "fulfilled") {
        setLaunchStatus(readinessResult.value.data);
      } else {
        setLaunchStatus(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadEverything();
  }, []);

  const d = payload?.data;

  return (
    <div className="grid gap-14">
      <PageTitle title="Admin Overview" subtitle="Class operations, engagement, and risk monitoring" />

      <PageSection
        actions={
          <ActionBar>
            <button onClick={() => void loadEverything()} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh overview"}
            </button>
            {busy ? <span className="pill">Loading latest data...</span> : null}
          </ActionBar>
        }
      >
        <p className="m-0 text-muted">Use this page for launch-state monitoring and class health checks.</p>
      </PageSection>

      <PageSection title="Quick Links">
        <ActionBar>
          <Link href="/admin/students" className="pill">Students</Link>
          <Link href="/admin/analytics" className="pill">Analytics</Link>
          <Link href="/admin/curriculum" className="pill">Curriculum</Link>
          <Link href="/admin/broadcast" className="pill">Broadcast</Link>
          <Link href="/admin/raffles" className="pill">Raffles</Link>
          <Link href="/admin/invites" className="pill">Invites</Link>
          <Link href="/admin/audit-log" className="pill">Audit Log</Link>
          <Link href="/admin/launch" className="pill">Launch Center</Link>
        </ActionBar>
      </PageSection>

      {error ? <FeedbackBanner kind="error">Overview load failed: {error}</FeedbackBanner> : null}

      {busy && !payload ? (
        <div className="grid grid-2">
          <LoadingSkeleton lines={2} />
          <LoadingSkeleton lines={2} />
        </div>
      ) : null}

      <div className="grid grid-2">
        <StatCard label="Students" value={d?.student_count ?? 0} accent="brand" />
        <StatCard label="Portal Active" value={d?.portal_active_users ?? 0} accent="success" />
        <StatCard label="Invited" value={d?.portal_invited_users ?? 0} accent="info" />
        <StatCard label="Claims Today" value={d?.claims_today ?? 0} accent="brand" />
      </div>

      <PageSection title={`Launch Health (Last ${d?.launch_health.window_hours ?? 24}h)`}>
        <ActionBar>
          <span className="pill">Readiness: {launchStatus?.overall_status || "UNKNOWN"}</span>
          <Link href="/admin/launch">Open Launch Center</Link>
        </ActionBar>

        {launchStatus?.checks?.length ? (
          <DataTable headers={["Check", "Status", "Detail"]}>
            {launchStatus.checks.slice(0, 3).map((c) => (
              <tr key={c.id}>
                <td>{c.label}</td>
                <td>{c.status}</td>
                <td>{c.detail}</td>
              </tr>
            ))}
          </DataTable>
        ) : null}

        <div className="grid grid-2">
          <StatCard label="Claim Errors" value={d?.launch_health.claims_errors ?? 0} accent="danger" />
          <StatCard label="Auth Errors" value={d?.launch_health.auth_errors ?? 0} accent="danger" />
          <StatCard label="Action Failures" value={d?.launch_health.action_failures ?? 0} accent="danger" />
          <StatCard label="Open Support Tickets" value={d?.launch_health.support_open ?? 0} accent="info" />
        </div>
      </PageSection>

      <PageSection title="Raffle Status">
        {d?.active_raffle ? (
          <div className="stack-8">
            <div className="pill">{d.active_raffle.status}</div>
            <div>
              <strong>{d.active_raffle.title}</strong>
            </div>
            <div>Prize: {d.active_raffle.prize}</div>
            <div>Entries: {d.active_raffle_entries}</div>
            <div>Raffle ID: {d.active_raffle.raffle_id}</div>
          </div>
        ) : (
          <EmptyState title="No active raffle" body="No active raffle." />
        )}
      </PageSection>

      <PageSection title="Recent Errors">
        {(d?.recent_errors || []).length ? (
          <DataTable headers={["Time", "Event", "Details"]}>
            {(d?.recent_errors || []).map((r, idx) => (
              <tr key={`${r.ts}-${idx}`}>
                <td>{new Date(r.ts).toLocaleString()}</td>
                <td>{r.event}</td>
                <td className="muted-13" style={{ whiteSpace: "pre-wrap" }}>{r.details_json}</td>
              </tr>
            ))}
          </DataTable>
        ) : (
          <EmptyState title="No recent errors" body="No recent errors." />
        )}
      </PageSection>
    </div>
  );
}
