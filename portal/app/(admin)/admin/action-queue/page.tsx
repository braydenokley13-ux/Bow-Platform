"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

interface QueueItem {
  action_id: string;
  action: string;
  status: "pending" | "running" | "done" | "error";
  created_at: string;
  detail?: string;
}

interface QueuePayload {
  ok: boolean;
  data: { items?: QueueItem[]; queue?: QueueItem[]; actions?: QueueItem[] };
}

function statusPill(s: string) {
  if (s === "done")    return <span className="pill pill-success">Done</span>;
  if (s === "error")   return <span className="pill pill-danger">Error</span>;
  if (s === "running") return <span className="pill pill-warn">Running</span>;
  return <span className="pill">Pending</span>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function normalise(p: QueuePayload): QueueItem[] {
  return p.data.items ?? p.data.queue ?? p.data.actions ?? [];
}

export default function ActionQueuePage() {
  const [actionId, setActionId] = useState("");
  const [busy, setBusy]         = useState(false);
  const [running, setRunning]   = useState(false);
  const [msg, setMsg]           = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [items, setItems]       = useState<QueueItem[]>([]);

  async function loadQueue() {
    setBusy(true);
    try {
      const res = await apiFetch<QueuePayload>("/api/admin/action-queue");
      setItems(normalise(res));
    } catch {
      // non-fatal — queue may be empty
    } finally {
      setBusy(false);
    }
  }

  async function onRun(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setRunning(true);
    try {
      await apiFetch(
        `/api/admin/action-queue/${encodeURIComponent(actionId)}/run`,
        { method: "POST" }
      );
      setMsg({ kind: "success", text: "Action executed successfully." });
      setActionId("");
      void loadQueue();
    } catch (err) {
      setMsg({ kind: "error", text: err instanceof Error ? err.message : "Run failed" });
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { void loadQueue(); }, []);

  return (
    <div className="grid gap-5">
      <PageTitle
        title="Action Queue"
        subtitle="View and run queued admin actions"
      />

      <form className="card form-stack max-w-md" onSubmit={onRun}>
        <div className="field">
          <span>Action ID</span>
          <input
            placeholder="e.g. recalc-xp-all"
            value={actionId}
            onChange={(e) => setActionId(e.target.value)}
            required
            disabled={running}
          />
        </div>
        <div className="action-bar">
          <button disabled={running || !actionId.trim()}>
            {running ? "Running…" : "Run action"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => void loadQueue()}
            disabled={busy}
          >
            {busy ? "Refreshing…" : "Refresh queue"}
          </button>
        </div>
        {msg && (
          <div className={`banner banner-${msg.kind === "success" ? "success" : "error"}`}>
            {msg.text}
          </div>
        )}
      </form>

      {busy && items.length === 0 && (
        <section className="card">
          <LoadingSkeleton lines={5} />
        </section>
      )}

      {!busy && items.length === 0 && (
        <div className="empty-state">
          <h3>Queue is empty</h3>
          <p>No pending actions. Use the form above to run a specific action by ID.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="table-wrap">
          <DataTable headers={["Action ID", "Action", "Status", "Created", "Detail"]} stickyHeader>
            {items.map((item) => (
              <tr key={item.action_id}>
                <td className="text-sm fw-semi" style={{ fontFamily: "monospace" }}>
                  {item.action_id}
                </td>
                <td className="text-sm">{item.action}</td>
                <td>{statusPill(item.status)}</td>
                <td className="text-sm text-muted">{fmt(item.created_at)}</td>
                <td className="text-sm text-muted">{item.detail ?? "—"}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </div>
  );
}
