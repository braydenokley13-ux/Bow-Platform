"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageTitle } from "@/components/page-title";
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
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Admin Overview" subtitle="Class operations, engagement, and risk monitoring" />

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => void loadEverything()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh overview"}
        </button>
        {busy ? <span className="pill">Loading latest data...</span> : null}
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">
            <strong>Overview load failed:</strong> {error}
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={() => void loadEverything()} className="secondary">
              Retry
            </button>
          </div>
        </section>
      ) : null}

      {busy && !payload ? (
        <section className="grid grid-2">
          <article className="card">
            <div className="skeleton sk-line" style={{ width: "35%" }} />
            <div className="skeleton sk-title" />
          </article>
          <article className="card">
            <div className="skeleton sk-line" style={{ width: "35%" }} />
            <div className="skeleton sk-title" />
          </article>
        </section>
      ) : null}

      <section className="grid grid-2">
        <article className="card">
          <div className="kicker">Students</div>
          <h2 style={{ margin: "8px 0" }}>{d?.student_count ?? 0}</h2>
        </article>
        <article className="card">
          <div className="kicker">Portal Active</div>
          <h2 style={{ margin: "8px 0" }}>{d?.portal_active_users ?? 0}</h2>
        </article>
        <article className="card">
          <div className="kicker">Invited</div>
          <h2 style={{ margin: "8px 0" }}>{d?.portal_invited_users ?? 0}</h2>
        </article>
        <article className="card">
          <div className="kicker">Claims Today</div>
          <h2 style={{ margin: "8px 0" }}>{d?.claims_today ?? 0}</h2>
        </article>
      </section>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Launch Health (Last {d?.launch_health.window_hours ?? 24}h)</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="pill">Readiness: {launchStatus?.overall_status || "UNKNOWN"}</span>
          <Link href="/admin/launch">Open Launch Center</Link>
        </div>
        {launchStatus?.checks?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Status</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {launchStatus.checks.slice(0, 3).map((c) => (
                  <tr key={c.id}>
                    <td>{c.label}</td>
                    <td>{c.status}</td>
                    <td>{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="grid grid-2">
          <article className="card" style={{ padding: 12 }}>
            <div className="kicker">Claim Errors</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{d?.launch_health.claims_errors ?? 0}</div>
          </article>
          <article className="card" style={{ padding: 12 }}>
            <div className="kicker">Auth Errors</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{d?.launch_health.auth_errors ?? 0}</div>
          </article>
          <article className="card" style={{ padding: 12 }}>
            <div className="kicker">Action Failures</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{d?.launch_health.action_failures ?? 0}</div>
          </article>
          <article className="card" style={{ padding: 12 }}>
            <div className="kicker">Open Support Tickets</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{d?.launch_health.support_open ?? 0}</div>
          </article>
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Raffle Status</h2>
        {d?.active_raffle ? (
          <>
            <div className="pill">{d.active_raffle.status}</div>
            <div>
              <strong>{d.active_raffle.title}</strong>
            </div>
            <div>Prize: {d.active_raffle.prize}</div>
            <div>Entries: {d.active_raffle_entries}</div>
            <div>Raffle ID: {d.active_raffle.raffle_id}</div>
          </>
        ) : (
          <p style={{ margin: 0 }}>No active raffle.</p>
        )}
      </section>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Recent Errors</h2>
        {(d?.recent_errors || []).length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {(d?.recent_errors || []).map((r, idx) => (
                  <tr key={`${r.ts}-${idx}`}>
                    <td>{new Date(r.ts).toLocaleString()}</td>
                    <td>{r.event}</td>
                    <td style={{ maxWidth: 500, whiteSpace: "pre-wrap" }}>{r.details_json}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ margin: 0 }}>No recent errors.</p>
        )}
      </section>
    </div>
  );
}
