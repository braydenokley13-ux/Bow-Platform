"use client";

import { useCallback, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface CurriculumModule {
  module_id: string;
  module_title?: string;
  program_id?: string;
  status?: string;
  sort_order?: number;
}

interface CurriculumPayload {
  ok: boolean;
  data: { modules?: CurriculumModule[]; programs?: { program_id: string; name: string }[] };
}

interface AuditEvent {
  ts: string;
  event: string;
  actor?: string;
}

interface AuditPayload {
  ok: boolean;
  data: { events: AuditEvent[] };
}

export default function CurriculumPublishPage() {
  const [notes, setNotes] = useState("Publish from admin console");
  const [rollbackBatchId, setRollbackBatchId] = useState("");
  const [actionMsg, setActionMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [curriculum, setCurriculum] = useState<CurriculumPayload["data"] | null>(null);
  const [currBusy, setCurrBusy] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditBusy, setAuditBusy] = useState(false);

  const loadCurriculum = useCallback(async () => {
    setCurrBusy(true);
    try {
      const res = await apiFetch<CurriculumPayload>("/api/me/curriculum");
      setCurriculum(res.data ?? null);
    } catch {
      // non-fatal
    } finally {
      setCurrBusy(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditBusy(true);
    try {
      const res = await apiFetch<AuditPayload>("/api/admin/audit-log?limit=10");
      setAuditEvents(res.data?.events ?? []);
    } catch {
      // non-fatal
    } finally {
      setAuditBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadCurriculum();
    void loadAudit();
  }, [loadCurriculum, loadAudit]);

  async function runPublish() {
    setBusy(true);
    setActionMsg(null);
    try {
      await apiFetch("/api/admin/curriculum/publish", { method: "POST", json: { notes } });
      setActionMsg({ kind: "success", text: "Publish completed successfully." });
      void loadCurriculum();
      void loadAudit();
    } catch (err) {
      setActionMsg({ kind: "error", text: err instanceof Error ? err.message : "Publish failed" });
    } finally {
      setBusy(false);
    }
  }

  async function runRollback() {
    setBusy(true);
    setActionMsg(null);
    try {
      await apiFetch("/api/admin/curriculum/rollback", {
        method: "POST",
        json: { publish_batch_id: rollbackBatchId || undefined }
      });
      setActionMsg({ kind: "success", text: "Rollback completed successfully." });
      void loadCurriculum();
      void loadAudit();
    } catch (err) {
      setActionMsg({ kind: "error", text: err instanceof Error ? err.message : "Rollback failed" });
    } finally {
      setBusy(false);
    }
  }

  const modules = curriculum?.modules ?? [];

  return (
    <div className="grid gap-14">
      <PageTitle title="Publish Console" subtitle="Publish Draft curriculum atomically and rollback safely" />

      <section className="card stack-10">
        <h2 className="title-18">Publish</h2>
        <label>
          Publish Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div>
          <button onClick={() => void runPublish()} disabled={busy}>
            {busy ? "Working..." : "Publish Draft Now"}
          </button>
        </div>
      </section>

      <section className="card stack-10">
        <h2 className="title-18">Rollback</h2>
        <label>
          Target Publish Batch ID (optional)
          <input
            value={rollbackBatchId}
            onChange={(e) => setRollbackBatchId(e.target.value)}
            placeholder="Leave blank to rollback to previous batch"
          />
        </label>
        <div>
          <button className="secondary" onClick={() => void runRollback()} disabled={busy}>
            {busy ? "Working..." : "Rollback Published Curriculum"}
          </button>
        </div>
      </section>

      {actionMsg ? (
        <FeedbackBanner kind={actionMsg.kind}>{actionMsg.text}</FeedbackBanner>
      ) : null}

      <section className="card stack-10">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="title-16" style={{ margin: 0 }}>Current Published Curriculum</h2>
          <button className="secondary" onClick={() => void loadCurriculum()} disabled={currBusy} style={{ fontSize: 13 }}>
            {currBusy ? "Loading..." : "Refresh"}
          </button>
        </div>
        {currBusy ? (
          <LoadingSkeleton lines={3} />
        ) : modules.length === 0 ? (
          <EmptyState title="No published curriculum" body="Publish a draft to see modules here." />
        ) : (
          <DataTable headers={["Module ID", "Title", "Program", "Status", "Order"]}>
            {modules.map((m) => (
              <tr key={m.module_id}>
                <td><code style={{ fontSize: 11 }}>{m.module_id}</code></td>
                <td style={{ fontWeight: 500 }}>{m.module_title ?? "—"}</td>
                <td style={{ fontSize: 13 }}>{m.program_id ?? "—"}</td>
                <td>
                  <span className="pill" style={{ fontSize: 11 }}>{m.status ?? "published"}</span>
                </td>
                <td style={{ fontSize: 13 }}>{m.sort_order ?? "—"}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>

      <section className="card stack-10">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="title-16" style={{ margin: 0 }}>Recent Publish / Rollback Events</h2>
          <button className="secondary" onClick={() => void loadAudit()} disabled={auditBusy} style={{ fontSize: 13 }}>
            {auditBusy ? "Loading..." : "Refresh"}
          </button>
        </div>
        {auditBusy ? (
          <LoadingSkeleton lines={3} />
        ) : auditEvents.length === 0 ? (
          <EmptyState title="No events yet" body="Publish/rollback events will appear here." />
        ) : (
          <DataTable headers={["Time", "Event", "Actor"]}>
            {auditEvents.map((ev, idx) => (
              <tr key={`${ev.ts}-${idx}`}>
                <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>{new Date(ev.ts).toLocaleString()}</td>
                <td style={{ fontWeight: 500 }}>{ev.event}</td>
                <td style={{ fontSize: 13 }}>{ev.actor ?? "—"}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
