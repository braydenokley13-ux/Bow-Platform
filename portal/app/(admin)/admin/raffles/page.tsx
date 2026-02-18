"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface Raffle {
  raffle_id: string;
  title: string;
  prize: string;
  status: string;
  closes_at?: string;
  winner_email?: string;
  entry_count?: number;
}

interface RafflesPayload {
  ok: boolean;
  data: { raffles: Raffle[] };
}

const statusColor: Record<string, string> = {
  OPEN: "var(--accent, #3b82f6)",
  CLOSED: "var(--muted, #6b7280)",
  DRAWN: "var(--success, #16a34a)"
};

export default function AdminRafflesPage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [createMsg, setCreateMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [drawMsg, setDrawMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    try {
      const res = await apiFetch<RafflesPayload>("/api/admin/raffles");
      setRaffles(res.data?.raffles ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load raffles");
    } finally {
      setLoadBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRaffle(e: FormEvent) {
    e.preventDefault();
    setCreateBusy(true);
    setCreateMsg(null);
    try {
      await apiFetch("/api/admin/raffles", {
        method: "POST",
        json: { title, prize, closes_at: closesAt || undefined }
      });
      setCreateMsg({ kind: "success", text: "Raffle created." });
      setTitle("");
      setPrize("");
      setClosesAt("");
      await load();
    } catch (err) {
      setCreateMsg({ kind: "error", text: err instanceof Error ? err.message : "Create failed" });
    } finally {
      setCreateBusy(false);
    }
  }

  async function closeDraw(raffleId: string) {
    setDrawingId(raffleId);
    setDrawMsg(null);
    try {
      await apiFetch(`/api/admin/raffles/${encodeURIComponent(raffleId)}/close-draw`, {
        method: "POST"
      });
      setDrawMsg({ kind: "success", text: `Raffle ${raffleId} closed and winner drawn.` });
      await load();
    } catch (err) {
      setDrawMsg({ kind: "error", text: err instanceof Error ? err.message : "Close/draw failed" });
    } finally {
      setDrawingId(null);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Raffle Manager" subtitle="Manual raffle lifecycle and winner draw" />

      <form className="card stack-10 max-w-640" onSubmit={(e) => void createRaffle(e)}>
        <h2 className="title-18">Create Raffle</h2>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Prize
          <input value={prize} onChange={(e) => setPrize(e.target.value)} required />
        </label>
        <label>
          Suggested Close Time (optional, ISO)
          <input value={closesAt} onChange={(e) => setClosesAt(e.target.value)} placeholder="2026-03-10T20:00:00-05:00" />
        </label>
        <button disabled={createBusy}>{createBusy ? "Creating..." : "Create active raffle"}</button>
        {createMsg ? (
          <div className={`banner ${createMsg.kind === "error" ? "banner-error" : "banner-success"}`}>
            {createMsg.text}
          </div>
        ) : null}
      </form>

      {drawMsg ? <FeedbackBanner kind={drawMsg.kind}>{drawMsg.text}</FeedbackBanner> : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="title-16" style={{ margin: 0 }}>All Raffles</h2>
        <button className="secondary" onClick={() => void load()} disabled={loadBusy} style={{ fontSize: 13 }}>
          {loadBusy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loadError ? <FeedbackBanner kind="error">{loadError}</FeedbackBanner> : null}

      {loadBusy && raffles.length === 0 ? (
        <LoadingSkeleton lines={4} />
      ) : raffles.length === 0 ? (
        <EmptyState title="No raffles yet" body="Create your first raffle above." />
      ) : (
        <section className="card" style={{ padding: 0 }}>
          <DataTable headers={["Title", "Prize", "Status", "Closes At", "Entries", "Winner", "Action"]} stickyHeader>
            {raffles.map((r) => {
              const status = r.status?.toUpperCase() ?? "OPEN";
              const isDrawing = drawingId === r.raffle_id;
              const canDraw = status === "OPEN";
              return (
                <tr key={r.raffle_id}>
                  <td style={{ fontWeight: 500 }}>{r.title}</td>
                  <td>{r.prize}</td>
                  <td>
                    <span
                      className="pill"
                      style={{ fontSize: 11, color: statusColor[status] ?? "inherit" }}
                    >
                      {status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                    {r.closes_at ? new Date(r.closes_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{r.entry_count ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{r.winner_email ?? "—"}</td>
                  <td>
                    {canDraw ? (
                      <button
                        className="danger"
                        style={{ fontSize: 12, padding: "4px 10px" }}
                        disabled={isDrawing}
                        onClick={() => void closeDraw(r.raffle_id)}
                      >
                        {isDrawing ? "Drawing..." : "Close & Draw"}
                      </button>
                    ) : "—"}
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
