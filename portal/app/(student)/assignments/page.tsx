"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

interface Assignment {
  assignment_id: string;
  title: string;
  description?: string;
  status: "pending" | "submitted" | "complete" | "late" | string;
  due_at?: string;
  submitted_at?: string;
  xp_reward?: number;
}

interface AssignmentsPayload {
  ok: boolean;
  data: { assignments?: Assignment[]; items?: Assignment[] };
}

function statusPill(s: string) {
  if (s === "complete" || s === "submitted") return <span className="pill pill-success">{s}</span>;
  if (s === "late")    return <span className="pill pill-danger">Late</span>;
  return <span className="pill">{s}</span>;
}

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function normalise(p: AssignmentsPayload): Assignment[] {
  return p.data.assignments ?? p.data.items ?? [];
}

export default function AssignmentsPage() {
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<AssignmentsPayload>("/api/assignments");
      setAssignments(normalise(res));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setBusy(false);
    }
  }

  async function onComplete(e: FormEvent) {
    e.preventDefault();
    setSubmitMsg(null);
    setSubmitting(true);
    try {
      await apiFetch(
        `/api/assignments/${encodeURIComponent(selectedId)}/mark-complete`,
        { method: "POST", body: JSON.stringify({ notes }) }
      );
      setSubmitMsg({ ok: true, text: "Assignment marked complete." });
      setSelectedId("");
      setNotes("");
      void load();
    } catch (err) {
      setSubmitMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Failed to mark complete",
      });
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const pending = assignments.filter((a) => a.status === "pending" || a.status === "late");

  return (
    <div className="grid gap-5">
      <PageTitle title="Assignments" subtitle="Track your tasks and submit completions" />

      <div className="action-bar">
        <button className="secondary" onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {busy && assignments.length === 0 && (
        <section className="card"><LoadingSkeleton lines={5} /></section>
      )}

      {!busy && assignments.length === 0 && !error && (
        <div className="empty-state">
          <h3>No assignments yet</h3>
          <p>Assignments will appear here when your instructor posts them.</p>
        </div>
      )}

      {assignments.length > 0 && (
        <div className="table-wrap">
          <DataTable
            headers={["Title", "Status", "Due", "Submitted", "XP"]}
            stickyHeader
          >
            {assignments.map((a) => (
              <tr
                key={a.assignment_id}
                style={{ cursor: a.status === "pending" ? "pointer" : undefined }}
                onClick={() => {
                  if (a.status === "pending") setSelectedId(a.assignment_id);
                }}
              >
                <td>
                  <p className="fw-semi m-0">{a.title}</p>
                  {a.description && <p className="text-muted text-sm m-0">{a.description}</p>}
                </td>
                <td>{statusPill(a.status)}</td>
                <td className="text-sm text-muted">{fmt(a.due_at)}</td>
                <td className="text-sm text-muted">{fmt(a.submitted_at)}</td>
                <td className="fw-semi">{a.xp_reward ? `+${a.xp_reward} XP` : "—"}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}

      {pending.length > 0 && (
        <form className="card form-stack max-w-md" onSubmit={onComplete}>
          <h2 className="section-heading">Mark Assignment Complete</h2>
          <div className="field">
            <span>Assignment</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
              disabled={submitting}
            >
              <option value="">Select assignment…</option>
              {pending.map((a) => (
                <option key={a.assignment_id} value={a.assignment_id}>{a.title}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <span>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes for your instructor…"
              disabled={submitting}
            />
          </div>
          <div className="action-bar">
            <button disabled={submitting || !selectedId}>
              {submitting ? "Submitting…" : "Mark complete"}
            </button>
          </div>
          {submitMsg && (
            <div className={`banner${submitMsg.ok ? " banner-success" : " banner-error"}`}>
              {submitMsg.text}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
