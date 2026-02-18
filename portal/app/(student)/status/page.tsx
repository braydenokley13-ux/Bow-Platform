"use client";

import { useEffect, useState, useCallback } from "react";
import { PageTitle } from "@/components/page-title";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "down" | string;
  message?: string;
}

interface StatusPayload {
  ok: boolean;
  data: {
    overall: string;
    services?: ServiceStatus[];
    checked_at?: string;
    message?: string;
  };
}

const statusColor: Record<string, string> = {
  operational: "var(--success, #16a34a)",
  degraded: "var(--warning, #d97706)",
  down: "var(--danger, #dc2626)"
};

const statusDot = (s: string) => (
  <span
    style={{
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: "50%",
      backgroundColor: statusColor[s] ?? "var(--muted, #9ca3af)",
      flexShrink: 0
    }}
  />
);

export default function StatusPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<StatusPayload["data"] | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<StatusPayload>("/api/status");
      setPayload(res.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overallOk = payload?.overall === "operational";

  return (
    <div className="grid gap-14">
      <PageTitle title="Platform Status" subtitle="Operational status and recent issues" />

      {error ? <FeedbackBanner kind="error">{error}</FeedbackBanner> : null}

      {busy ? (
        <LoadingSkeleton lines={4} />
      ) : payload ? (
        <>
          <section className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {statusDot(payload.overall ?? "unknown")}
              <span style={{ fontWeight: 700, fontSize: 16 }}>
                {overallOk ? "All systems operational" : payload.overall ?? "Status unknown"}
              </span>
            </div>
            {payload.message ? (
              <p className="m-0" style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>{payload.message}</p>
            ) : null}
            {payload.checked_at ? (
              <p className="m-0" style={{ marginTop: 6, fontSize: 12, opacity: 0.45 }}>
                Checked {new Date(payload.checked_at).toLocaleString()}
              </p>
            ) : null}
          </section>

          {payload.services && payload.services.length > 0 ? (
            <section className="card" style={{ display: "grid", gap: 0, padding: 0 }}>
              {payload.services.map((svc, idx) => (
                <div
                  key={svc.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 18px",
                    borderBottom: idx < payload.services!.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none"
                  }}
                >
                  {statusDot(svc.status)}
                  <span style={{ fontWeight: 500, flex: 1 }}>{svc.name}</span>
                  <span style={{ fontSize: 13, color: statusColor[svc.status] ?? "inherit" }}>
                    {svc.status}
                  </span>
                  {svc.message ? (
                    <span style={{ fontSize: 12, opacity: 0.55, marginLeft: 8 }}>{svc.message}</span>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}
        </>
      ) : null}

      <section className="card">
        <button className="secondary" onClick={() => void load()} disabled={busy}>
          {busy ? "Checking..." : "Refresh status"}
        </button>
      </section>
    </div>
  );
}
