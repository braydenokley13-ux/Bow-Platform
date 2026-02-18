"use client";

import { useCallback, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface QueueItem {
  action_id: string;
  action_type?: string;
  status?: string;
  created_at?: string;
  payload_summary?: string;
}

interface QueuePayload {
  ok: boolean;
  data: { items: QueueItem[] };
}

const statusColor: Record<string, string> = {
  PENDING: "var(--muted, #6b7280)",
  RUNNING: "var(--accent, #3b82f6)",
  DONE: "var(--success, #16a34a)",
  FAILED: "var(--danger, #dc2626)"
};

export default function ActionQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runMsg, setRunMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    try {
      const res = await apiFetch<QueuePayload>("/api/admin/action-queue");
      setItems(res.data?.items ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load action queue");
    } finally {
      setLoadBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(actionId: string) {
    setRunningId(actionId);
    setRunMsg(null);
    try {
      await apiFetch(`/api/admin/action-queue/${encodeURIComponent(actionId)}/run`, {
        method: "POST"
      });
      setRunMsg({ kind: "success", text: `Action ${actionId} executed.` });
      await load();
    } catch (err) {
      setRunMsg({ kind: "error", text: err instanceof Error ? err.message : "Run failed" });
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Action Queue" subtitle="Run queued admin actions" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="kicker">{items.length} items in queue</span>
        <button className="secondary" onClick={() => void load()} disabled={loadBusy} style={{ fontSize: 13 }}>
          {loadBusy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {runMsg ? <FeedbackBanner kind={runMsg.kind}>{runMsg.text}</FeedbackBanner> : null}
      {loadError ? <FeedbackBanner kind="error">{loadError}</FeedbackBanner> : null}

      {loadBusy && items.length === 0 ? (
        <LoadingSkeleton lines={4} />
      ) : items.length === 0 ? (
        <EmptyState title="Queue is empty" body="No pending actions in the queue." />
      ) : (
        <section className="card" style={{ padding: 0 }}>
          <DataTable headers={["ID", "Type", "Status", "Created", "Summary", "Run"]} stickyHeader>
            {items.map((item) => {
              const status = item.status?.toUpperCase() ?? "PENDING";
              const isRunning = runningId === item.action_id;
              return (
                <tr key={item.action_id}>
                  <td>
                    <code style={{ fontSize: 11, fontFamily: "monospace" }}>{item.action_id}</code>
                  </td>
                  <td style={{ fontSize: 13 }}>{item.action_type ?? "—"}</td>
                  <td>
                    <span
                      className="pill"
                      style={{ fontSize: 11, color: statusColor[status] ?? "inherit" }}
                    >
                      {status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {item.created_at ? new Date(item.created_at).toLocaleString() : "—"}
                  </td>
                  <td style={{ fontSize: 12, opacity: 0.65, maxWidth: 280 }}>
                    {item.payload_summary ?? "—"}
                  </td>
                  <td>
                    <button
                      style={{ fontSize: 12, padding: "4px 10px" }}
                      disabled={isRunning || status === "DONE"}
                      onClick={() => void runAction(item.action_id)}
                    >
                      {isRunning ? "Running..." : "Run"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </section>
      )}
    </div>
  );
}
