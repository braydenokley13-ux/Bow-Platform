"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
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
  data: Raffle | null;
}

const statusColor: Record<string, string> = {
  OPEN: "var(--accent, #3b82f6)",
  CLOSED: "var(--muted, #6b7280)",
  DRAWN: "var(--success, #16a34a)"
};

export default function AdminRafflesPage() {
  const [activeRaffle, setActiveRaffle] = useState<Raffle | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [createMsg, setCreateMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  const [drawing, setDrawing] = useState(false);
  const [drawMsg, setDrawMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    try {
      const res = await apiFetch<RafflesPayload>("/api/admin/raffles");
      setActiveRaffle(res.data ?? null);
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
    setDrawing(true);
    setDrawMsg(null);
    try {
      await apiFetch(`/api/admin/raffles/${encodeURIComponent(raffleId)}/close-draw`, {
        method: "POST"
      });
      setDrawMsg({ kind: "success", text: `Raffle closed and winner drawn.` });
      await load();
    } catch (err) {
      setDrawMsg({ kind: "error", text: err instanceof Error ? err.message : "Close/draw failed" });
    } finally {
      setDrawing(false);
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
        <h2 className="title-16" style={{ margin: 0 }}>Active Raffle</h2>
        <button className="secondary" onClick={() => void load()} disabled={loadBusy} style={{ fontSize: 13 }}>
          {loadBusy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loadError ? <FeedbackBanner kind="error">{loadError}</FeedbackBanner> : null}

      {loadBusy && !activeRaffle ? (
        <LoadingSkeleton lines={4} />
      ) : activeRaffle ? (
        <section className="card stack-10">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <h3 className="title-16" style={{ margin: 0 }}>{activeRaffle.title}</h3>
              <p className="m-0" style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>
                Prize: {activeRaffle.prize}
              </p>
            </div>
            <span
              className="pill"
              style={{ fontSize: 11, color: statusColor[activeRaffle.status?.toUpperCase() ?? "OPEN"] ?? "inherit", flexShrink: 0 }}
            >
              {activeRaffle.status?.toUpperCase() ?? "OPEN"}
            </span>
          </div>
          <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
            {activeRaffle.closes_at ? (
              <p className="m-0" style={{ opacity: 0.65 }}>
                Closes: {new Date(activeRaffle.closes_at).toLocaleString()}
              </p>
            ) : null}
            {activeRaffle.entry_count != null ? (
              <p className="m-0" style={{ opacity: 0.65 }}>
                Entries: {activeRaffle.entry_count}
              </p>
            ) : null}
            {activeRaffle.winner_email ? (
              <p className="m-0">
                Winner: <strong>{activeRaffle.winner_email}</strong>
              </p>
            ) : null}
          </div>
          {activeRaffle.status?.toUpperCase() === "OPEN" ? (
            <div>
              <button
                className="danger"
                disabled={drawing}
                onClick={() => void closeDraw(activeRaffle.raffle_id)}
              >
                {drawing ? "Drawing..." : "Close & Draw Winner"}
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <EmptyState title="No active raffle" body="Create a raffle above to get started." />
      )}
    </div>
  );
}
