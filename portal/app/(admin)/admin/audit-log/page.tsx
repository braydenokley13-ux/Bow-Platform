"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

interface AuditEvent {
  event_id: string;
  admin_email?: string;
  actor?: string;
  action: string;
  target?: string;
  detail?: string;
  result?: "ok" | "error" | "warn";
  occurred_at: string;
}

interface AuditPayload {
  ok: boolean;
  data: { events?: AuditEvent[]; log?: AuditEvent[]; entries?: AuditEvent[] };
}

function resultPill(r?: string) {
  if (r === "ok")    return <span className="pill pill-success">OK</span>;
  if (r === "error") return <span className="pill pill-danger">Error</span>;
  if (r === "warn")  return <span className="pill pill-warn">Warn</span>;
  return <span className="pill">—</span>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function normalise(p: AuditPayload): AuditEvent[] {
  return p.data.events ?? p.data.log ?? p.data.entries ?? [];
}

export default function AdminAuditLogPage() {
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [limit, setLimit]   = useState(200);

  async function load(l: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<AuditPayload>(`/api/admin/audit-log?limit=${l}`);
      setEvents(normalise(res));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(limit); }, [limit]);

  return (
    <div className="grid gap-5">
      <PageTitle
        title="Audit Log"
        subtitle="Operational log and admin action trail"
      />

      <div className="filter-bar">
        <button className="secondary" onClick={() => void load(limit)} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
        <div className="field" style={{ margin: 0 }}>
          <span>Show</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            disabled={busy}
            style={{ width: "auto" }}
          >
            <option value={50}>Last 50</option>
            <option value={200}>Last 200</option>
            <option value={500}>Last 500</option>
          </select>
        </div>
        {events.length > 0 && (
          <span className="pill">{events.length} events</span>
        )}
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {busy && events.length === 0 && (
        <section className="card">
          <LoadingSkeleton lines={8} />
        </section>
      )}

      {!busy && events.length === 0 && !error && (
        <div className="empty-state">
          <h3>No audit events</h3>
          <p>Admin actions will appear here as they occur.</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="table-wrap">
          <DataTable
            headers={["Time", "Actor", "Action", "Target", "Result"]}
            stickyHeader
          >
            {events.map((ev) => (
              <tr key={ev.event_id}>
                <td className="text-sm text-muted" style={{ whiteSpace: "nowrap" }}>
                  {fmt(ev.occurred_at)}
                </td>
                <td className="text-sm">{ev.admin_email ?? ev.actor ?? "—"}</td>
                <td className="fw-semi text-sm">{ev.action}</td>
                <td className="text-sm text-muted">{ev.target ?? ev.detail ?? "—"}</td>
                <td>{resultPill(ev.result)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </div>
  );
}
