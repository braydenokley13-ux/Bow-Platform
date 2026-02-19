"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface Assignment {
  assignment_id: string;
  title: string;
  track: string;
  module: string;
  due_at?: string;
  status?: string;
  resource_url?: string;
  description?: string;
}

interface AssignmentsPayload {
  ok: boolean;
  data: Assignment[];
}

function statusPill(status?: string) {
  const s = status?.toUpperCase() ?? "PENDING";
  const color =
    s === "COMPLETE" ? "var(--success, #16a34a)"
    : s === "OVERDUE" ? "var(--danger, #dc2626)"
    : "var(--muted, #6b7280)";
  return (
    <span className="pill" style={{ fontSize: 11, color, borderColor: color }}>
      {s}
    </span>
  );
}

function isOverdue(dueAt?: string) {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [assignmentId, setAssignmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [completeMsg, setCompleteMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [completeBusy, setCompleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    try {
      const res = await apiFetch<AssignmentsPayload>("/api/assignments");
      setAssignments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setLoadBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onComplete(e: FormEvent) {
    e.preventDefault();
    setCompleteBusy(true);
    setCompleteMsg(null);
    try {
      await apiFetch(`/api/assignments/${encodeURIComponent(assignmentId)}/mark-complete`, {
        method: "POST",
        json: { notes }
      });
      setCompleteMsg({ kind: "success", text: "Assignment marked complete." });
      setAssignmentId("");
      setNotes("");
      await load();
    } catch (err) {
      setCompleteMsg({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to mark assignment complete"
      });
    } finally {
      setCompleteBusy(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Assignments" subtitle="Track assignment tasks and completion" />

      {loadError ? <FeedbackBanner kind="error">{loadError}</FeedbackBanner> : null}

      {loadBusy ? (
        <LoadingSkeleton lines={4} />
      ) : assignments.length === 0 ? (
        <EmptyState title="No assignments yet" body="Assignments will appear here when your instructor posts them." />
      ) : (
        <section className="card" style={{ padding: 0 }}>
          <DataTable headers={["Title", "Track", "Module", "Due", "Status", "Resource"]} stickyHeader>
            {assignments.map((a) => {
              const overdue = a.status !== "COMPLETE" && isOverdue(a.due_at);
              const effectiveStatus = overdue ? "OVERDUE" : a.status;
              return (
                <tr
                  key={a.assignment_id}
                  style={{ cursor: "pointer" }}
                  onClick={() => setAssignmentId(a.assignment_id)}
                  title="Click to pre-fill mark complete form"
                >
                  <td style={{ fontWeight: 500 }}>{a.title}</td>
                  <td>{a.track}</td>
                  <td>{a.module}</td>
                  <td style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    {a.due_at ? new Date(a.due_at).toLocaleDateString() : "—"}
                  </td>
                  <td>{statusPill(effectiveStatus)}</td>
                  <td>
                    {a.resource_url ? (
                      <a
                        href={a.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 13 }}
                      >
                        Open
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </section>
      )}

      <section className="card stack-10" style={{ maxWidth: 540 }}>
        <h2 className="title-16">Mark Assignment Complete</h2>
        <p className="m-0" style={{ fontSize: 13, opacity: 0.65 }}>
          Click a row above to pre-fill the assignment ID, or enter it manually.
        </p>
        <form onSubmit={(e) => void onComplete(e)} className="stack-10">
          <label>
            Assignment ID
            <input value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} required />
          </label>
          <label>
            Notes (optional)
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </label>
          <button disabled={completeBusy}>{completeBusy ? "Saving..." : "Mark complete"}</button>
        </form>
        {completeMsg ? (
          <div className={`banner ${completeMsg.kind === "error" ? "banner-error" : "banner-success"}`}>
            {completeMsg.text}
          </div>
        ) : null}
      </section>
    </div>
  );
}
