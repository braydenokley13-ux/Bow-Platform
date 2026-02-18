"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface HealthResponse {
  ok: boolean;
  status: string;
  ts: string;
  checks: {
    apps_script_url_configured: boolean;
    apps_script_secret_configured: boolean;
    firebase_project_configured: boolean;
  };
  backend?: {
    status: string;
    checks?: {
      shared_secret_configured?: boolean;
      schema_ok?: boolean;
      schema_error?: string;
    };
    errors_24h?: {
      total_errors?: number;
      claims_errors?: number;
      auth_errors?: number;
      action_failures?: number;
    };
  };
  error?: string;
}

interface ReadinessCheck {
  id: string;
  label: string;
  status: "PASS" | "WARN" | "FAIL";
  detail: string;
}

interface LaunchReadinessResponse {
  ok: boolean;
  data: {
    overall_status: "READY" | "READY_WITH_WARNINGS" | "NOT_READY";
    checks: ReadinessCheck[];
    validation_summary: {
      total: number;
      errors: number;
      warnings: number;
    };
  };
}

interface SmokeCheck {
  id: string;
  label: string;
  status: "PASS" | "FAIL";
  detail: string;
}

interface SmokeResponse {
  ok: boolean;
  data: {
    overall: "PASS" | "FAIL";
    failed: number;
    checks: SmokeCheck[];
  };
}

function toneForStatus(status: string) {
  const s = String(status).toUpperCase();
  if (s === "PASS" || s === "READY" || s === "HEALTHY") return "banner-success";
  if (s === "WARN" || s === "READY_WITH_WARNINGS" || s === "DEGRADED") return "";
  return "banner-error";
}

export default function AdminLaunchPage() {
  const [busy, setBusy] = useState(false);
  const [smokeBusy, setSmokeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [readiness, setReadiness] = useState<LaunchReadinessResponse["data"] | null>(null);
  const [smoke, setSmoke] = useState<SmokeResponse["data"] | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const [h, r] = await Promise.all([
        apiFetch<HealthResponse>("/api/health"),
        apiFetch<LaunchReadinessResponse>("/api/admin/launch-readiness")
      ]);
      setHealth(h);
      setReadiness(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load launch checks");
    } finally {
      setBusy(false);
    }
  }

  async function runSmoke() {
    setSmokeBusy(true);
    setError(null);
    try {
      const res = await apiFetch<SmokeResponse>("/api/admin/smoke/run", {
        method: "POST",
        json: {}
      });
      setSmoke(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Smoke test failed");
    } finally {
      setSmokeBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-14">
      <PageTitle title="Launch Readiness" subtitle="One place to confirm production health before and during launch week" />

      <section className="card row-8-center-wrap">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh checks"}
        </button>
        <button className="secondary" onClick={() => void runSmoke()} disabled={smokeBusy}>
          {smokeBusy ? "Running smoke..." : "Run smoke test"}
        </button>
        {readiness ? <span className="pill">Overall: {readiness.overall_status}</span> : null}
        {smoke ? <span className="pill">Smoke: {smoke.overall}</span> : null}
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="card stack-8">
        <h2 className="title-18">Platform Health</h2>
        {health ? (
          <>
            <div className={`banner ${toneForStatus(health.status)}`}>Status: {health.status}</div>
            <div className="grid grid-2">
              <article className="card p-12">
                <div className="kicker">Apps Script URL</div>
                <div>{health.checks.apps_script_url_configured ? "Configured" : "Missing"}</div>
              </article>
              <article className="card p-12">
                <div className="kicker">Apps Script Secret</div>
                <div>{health.checks.apps_script_secret_configured ? "Configured" : "Missing"}</div>
              </article>
              <article className="card p-12">
                <div className="kicker">Firebase Admin</div>
                <div>{health.checks.firebase_project_configured ? "Configured" : "Missing"}</div>
              </article>
              <article className="card p-12">
                <div className="kicker">Backend Errors (24h)</div>
                <div>{health.backend?.errors_24h?.total_errors ?? 0}</div>
              </article>
            </div>
          </>
        ) : (
          <p className="m-0">No health data yet.</p>
        )}
      </section>

      <section className="card stack-8">
        <h2 className="title-18">Launch Checklist</h2>
        {readiness?.checks?.length ? (
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
                {readiness.checks.map((c) => (
                  <tr key={c.id}>
                    <td>{c.label}</td>
                    <td>
                      <span className="pill">{c.status}</span>
                    </td>
                    <td>{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0">No checklist data yet.</p>
        )}
      </section>

      <section className="card stack-8">
        <h2 className="title-18">Smoke Test Results</h2>
        {smoke?.checks?.length ? (
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
                {smoke.checks.map((c) => (
                  <tr key={c.id}>
                    <td>{c.label}</td>
                    <td>
                      <span className="pill">{c.status}</span>
                    </td>
                    <td>{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0">Run the smoke test to generate results.</p>
        )}
      </section>
    </div>
  );
}
