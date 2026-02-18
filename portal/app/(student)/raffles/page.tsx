"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface ActiveRaffle {
  raffle_id: string;
  title: string;
  prize: string;
  status: string;
  closes_at?: string;
}

interface BalancePayload {
  ok: boolean;
  data: { balance: number };
}

interface ActiveRafflePayload {
  ok: boolean;
  data: { raffle: ActiveRaffle | null };
}

interface RaffleEntry {
  entry_id: string;
  raffle_id: string;
  raffle_title?: string;
  tickets_spent: number;
  created_at: string;
}

interface EntriesPayload {
  ok: boolean;
  data: { entries: RaffleEntry[] };
}

export default function RafflesPage() {
  const [raffleId, setRaffleId] = useState("");
  const [tickets, setTickets] = useState(1);
  const [enterBusy, setEnterBusy] = useState(false);
  const [enterMsg, setEnterMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [raffle, setRaffle] = useState<ActiveRaffle | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    try {
      const [activeRes, balanceRes, entriesRes] = await Promise.allSettled([
        apiFetch<ActiveRafflePayload>("/api/raffles/active"),
        apiFetch<BalancePayload>("/api/raffles/me/balance"),
        apiFetch<EntriesPayload>("/api/raffles/me/entries")
      ]);

      if (activeRes.status === "fulfilled") setRaffle(activeRes.value.data?.raffle ?? null);
      if (balanceRes.status === "fulfilled") setBalance(balanceRes.value.data?.balance ?? 0);
      if (entriesRes.status === "fulfilled") setEntries(entriesRes.value.data?.entries ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load raffle data");
    } finally {
      setLoadBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function onEnter(e: FormEvent) {
    e.preventDefault();
    setEnterBusy(true);
    setEnterMsg(null);
    try {
      await apiFetch(`/api/raffles/${encodeURIComponent(raffleId)}/enter`, {
        method: "POST",
        json: { ticketsSpent: Number(tickets) }
      });
      setEnterMsg({ kind: "success", text: `Entered with ${tickets} ticket${tickets !== 1 ? "s" : ""}!` });
      setRaffleId("");
      setTickets(1);
      await loadAll();
    } catch (err) {
      setEnterMsg({ kind: "error", text: err instanceof Error ? err.message : "Entry failed" });
    } finally {
      setEnterBusy(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Raffles" subtitle="1 ticket per 100 XP — spend tickets for raffle entries" />

      {loadError ? <FeedbackBanner kind="error">{loadError}</FeedbackBanner> : null}

      {loadBusy && raffle === null && balance === null ? (
        <LoadingSkeleton lines={3} />
      ) : (
        <div className="grid grid-2">
          <StatCard
            label="Ticket Balance"
            value={balance != null ? `${balance} ticket${balance !== 1 ? "s" : ""}` : "—"}
            accent="brand"
          />
          <section className="card stack-8">
            <p className="kicker">Active Raffle</p>
            {raffle ? (
              <>
                <h2 className="title-16" style={{ margin: 0 }}>{raffle.title}</h2>
                <p className="m-0" style={{ fontSize: 14 }}>Prize: <strong>{raffle.prize}</strong></p>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className="pill">{raffle.status}</span>
                  {raffle.closes_at ? (
                    <span style={{ fontSize: 12, opacity: 0.55 }}>
                      Closes {new Date(raffle.closes_at).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="m-0" style={{ opacity: 0.55, fontSize: 14 }}>No active raffle right now.</p>
            )}
          </section>
        </div>
      )}

      <section className="card stack-10" style={{ maxWidth: 480 }}>
        <h2 className="title-16">Enter a Raffle</h2>
        <form onSubmit={(e) => void onEnter(e)} className="stack-10">
          <label>
            Raffle ID
            <input
              value={raffleId}
              onChange={(e) => setRaffleId(e.target.value)}
              placeholder={raffle?.raffle_id ?? "Enter raffle ID"}
              required
            />
          </label>
          <label>
            Tickets to spend
            <input
              type="number"
              min={1}
              step={1}
              value={tickets}
              onChange={(e) => setTickets(Number(e.target.value || 1))}
              required
            />
          </label>
          <button disabled={enterBusy}>{enterBusy ? "Submitting..." : "Enter raffle"}</button>
        </form>
        {enterMsg ? (
          <div className={`banner ${enterMsg.kind === "error" ? "banner-error" : "banner-success"}`}>
            {enterMsg.text}
          </div>
        ) : null}
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 className="title-16">My Entries</h2>
        {entries.length === 0 ? (
          <EmptyState title="No entries yet" body="Enter a raffle above to get started." />
        ) : (
          <DataTable headers={["Raffle", "Tickets Spent", "Date"]}>
            {entries.map((e) => (
              <tr key={e.entry_id}>
                <td>{e.raffle_title ?? e.raffle_id}</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{e.tickets_spent}</td>
                <td style={{ fontSize: 13 }}>{new Date(e.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </div>
  );
}
