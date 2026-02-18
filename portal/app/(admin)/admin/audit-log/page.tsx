"use client";

import { useCallback, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface AuditEvent {
  ts: string;
  event: string;
  actor?: string;
  details_json?: string;
}

interface AuditLogPayload {
  ok: boolean;
  data: { events: AuditEvent[] };
}

export default function AdminAuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    try {
      const res = await apiFetch<AuditLogPayload>("/api/admin/audit-log?limit=300");
      setEvents(res.data?.events ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load audit log");
    } finally {
      setLoadBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="grid gap-14">
      <PageTitle title="Audit Log" subtitle="Operational log and admin action trail" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="kicker">{events.length} events</span>
        <button className="secondary" onClick={() => void load()} disabled={loadBusy} style={{ fontSize: 13 }}>
          {loadBusy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loadError ? <FeedbackBanner kind="error">{loadError}</FeedbackBanner> : null}

      {loadBusy && events.length === 0 ? (
        <LoadingSkeleton lines={6} />
      ) : events.length === 0 ? (
        <EmptyState title="No audit events" body="Audit events will appear here after admin actions." />
      ) : (
        <section className="card" style={{ padding: 0 }}>
          <DataTable headers={["Time", "Event", "Actor", "Details"]} stickyHeader>
            {events.map((ev, idx) => {
              const isExpanded = expandedIdx === idx;
              const detailSnippet = ev.details_json
                ? ev.details_json.length > 80
                  ? ev.details_json.slice(0, 80) + "…"
                  : ev.details_json
                : "—";
              return (
                <>
                  <tr
                    key={`${ev.ts}-${idx}`}
                    style={{ cursor: ev.details_json && ev.details_json.length > 80 ? "pointer" : "default" }}
                    onClick={() => ev.details_json && ev.details_json.length > 80 && setExpandedIdx(isExpanded ? null : idx)}
                  >
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                      {new Date(ev.ts).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 500 }}>{ev.event}</td>
                    <td style={{ fontSize: 13 }}>{ev.actor ?? "—"}</td>
                    <td>
                      <code style={{ fontSize: 11, fontFamily: "monospace", opacity: 0.75 }}>
                        {detailSnippet}
                      </code>
                      {ev.details_json && ev.details_json.length > 80 ? (
                        <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.5 }}>
                          {isExpanded ? "▲ collapse" : "▼ expand"}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr key={`${ev.ts}-${idx}-expanded`}>
                      <td colSpan={4} style={{ padding: "10px 16px", background: "var(--surface-2, #f9fafb)" }}>
                        <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {ev.details_json}
                        </pre>
                      </td>
                    </tr>
                  ) : null}
                </>
              );
            })}
          </DataTable>
        </section>
      )}
    </div>
  );
}
