"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";
import { apiFetch } from "@/lib/client-api";

export default function RafflesPage() {
  const [raffleId, setRaffleId] = useState("");
  const [tickets, setTickets] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function onEnter(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    setError(null);

    try {
      const json = await apiFetch(`/api/raffles/${encodeURIComponent(raffleId)}/enter`, {
        method: "POST",
        json: { ticketsSpent: Number(tickets) }
      });
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entry failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Raffles" subtitle="1 ticket per 100 XP. Manual ticket spend per entry." />
      <div className="grid grid-2">
        <FetchPanel endpoint="/api/raffles/active" title="Active raffle" />
        <FetchPanel endpoint="/api/raffles/me/balance" title="My ticket balance" />
      </div>
      <form className="card stack-10 max-w-420" onSubmit={onEnter}>
        <label>
          Raffle ID
          <input value={raffleId} onChange={(e) => setRaffleId(e.target.value)} required />
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
        <button disabled={busy}>{busy ? "Submitting..." : "Enter raffle"}</button>
      </form>
      {error ? <div className="banner banner-error">{error}</div> : null}
      {result ? (
        <pre className="card pre-wrap-13">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
      <FetchPanel endpoint="/api/raffles/me/entries" title="My raffle entries" />
    </div>
  );
}
