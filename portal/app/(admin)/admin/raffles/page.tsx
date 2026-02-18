"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";
import { apiFetch } from "@/lib/client-api";

export default function AdminRafflesPage() {
  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [raffleId, setRaffleId] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");

  async function createRaffle(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    try {
      await apiFetch("/api/admin/raffles", {
        method: "POST",
        json: { title, prize, closes_at: closesAt || undefined }
      });
      setMessageKind("success");
      setMessage("Raffle created.");
    } catch (err) {
      setMessageKind("error");
      setMessage(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function closeDraw(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    try {
      await apiFetch(`/api/admin/raffles/${encodeURIComponent(raffleId)}/close-draw`, {
        method: "POST"
      });
      setMessageKind("success");
      setMessage("Raffle closed and draw completed.");
    } catch (err) {
      setMessageKind("error");
      setMessage(err instanceof Error ? err.message : "Close/draw failed");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Raffle Manager" subtitle="Manual raffle lifecycle and winner draw" />
      <form className="card stack-10 max-w-640" onSubmit={createRaffle}>
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
          <input value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
        </label>
        <button>Create active raffle</button>
      </form>

      <form className="card stack-10 max-w-640" onSubmit={closeDraw}>
        <h2 className="title-18">Close & Draw</h2>
        <label>
          Raffle ID
          <input value={raffleId} onChange={(e) => setRaffleId(e.target.value)} required />
        </label>
        <button className="danger">Close raffle and draw winner</button>
      </form>

      {message ? (
        <div className={`banner ${messageKind === "error" ? "banner-error" : "banner-success"}`}>{message}</div>
      ) : null}
      <FetchPanel endpoint="/api/raffles/active" title="Active raffle snapshot" />
    </div>
  );
}
