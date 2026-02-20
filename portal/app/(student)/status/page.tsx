"use client";

import { useEffect, useState, useCallback } from "react";
import { PageTitle } from "@/components/page-title";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface ActiveRaffle {
  title?: string;
  closes_at?: string;
}

interface RecentError {
  ts: string;
  event: string;
}

interface StatusPayload {
  ok: boolean;
  data: {
    portal: string;
    active_raffle: ActiveRaffle | null;
    recent_errors: RecentError[];
  };
}

const portalColor: Record<string, string> = {
  OPERATIONAL: "var(--success, #16a34a)",
  DEGRADED: "var(--warning, #d97706)",
  DOWN: "var(--danger, #dc2626)"
};

const statusDot = (s: string) => (
  <span
    style={{
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: "50%",
      backgroundColor: portalColor[s] ?? "var(--muted, #9ca3af)",
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

  const portalStatus = payload?.portal ?? "UNKNOWN";
  const isOperational = portalStatus === "OPERATIONAL";

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
              {statusDot(portalStatus)}
              <span style={{ fontWeight: 700, fontSize: 16, color: portalColor[portalStatus] ?? "inherit" }}>
                {isOperational ? "All systems operational" : portalStatus}
              </span>
            </div>
          </section>

          <section className="card stack-8">
            <h2 className="title-16" style={{ margin: 0 }}>Active Raffle</h2>
            {payload.active_raffle ? (
              <div>
                <p className="m-0" style={{ fontWeight: 500 }}>{payload.active_raffle.title ?? "Unnamed raffle"}</p>
                {payload.active_raffle.closes_at ? (
                  <p className="m-0" style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>
                    Closes {new Date(payload.active_raffle.closes_at).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="m-0" style={{ fontSize: 14, opacity: 0.6 }}>No active raffle at this time.</p>
            )}
          </section>

          {payload.recent_errors && payload.recent_errors.length > 0 ? (
            <section className="card stack-8">
              <h2 className="title-16" style={{ margin: 0 }}>Recent Issues</h2>
              <div style={{ display: "grid", gap: 0 }}>
                {payload.recent_errors.map((err, idx) => (
                  <div
                    key={`${err.ts}-${idx}`}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "8px 0",
                      borderBottom: idx < payload.recent_errors.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none",
                      fontSize: 13
                    }}
                  >
                    <span style={{ opacity: 0.45, whiteSpace: "nowrap", fontSize: 12 }}>
                      {new Date(err.ts).toLocaleString()}
                    </span>
                    <span>{err.event}</span>
                  </div>
                ))}
              </div>
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
