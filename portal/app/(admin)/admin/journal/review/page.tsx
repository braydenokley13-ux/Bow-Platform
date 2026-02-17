"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface JournalReviewRow {
  entry_id: string;
  email: string;
  claim_code: string;
  lesson_key: string;
  module_id: string;
  role: string;
  decision_text: string;
  rationale_text: string;
  outcome_text: string;
  submitted_at: string;
}

export default function AdminJournalReviewPage() {
  const [rows, setRows] = useState<JournalReviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [entryId, setEntryId] = useState("");
  const [dq, setDq] = useState("3");
  const [fin, setFin] = useState("3");
  const [risk, setRisk] = useState("3");
  const [comm, setComm] = useState("3");
  const [coachNote, setCoachNote] = useState("");

  async function load() {
    setBusy(true);
    setMessage("");
    try {
      const json = await apiFetch<Envelope<JournalReviewRow[]>>("/api/admin/journal/review");
      setRows(json.data || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load review queue");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitScore(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!entryId) {
      setMessage("Select an entry from the queue first.");
      return;
    }

    try {
      await apiFetch("/api/admin/journal/score", {
        method: "POST",
        json: {
          entry_id: entryId,
          score_decision_quality: Number(dq),
          score_financial_logic: Number(fin),
          score_risk_management: Number(risk),
          score_communication: Number(comm),
          coach_note: coachNote
        }
      });
      setMessage("Journal entry scored.");
      setCoachNote("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Scoring failed");
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Journal Review Queue" subtitle="Instructor rubric scoring for submitted decision journals" />

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh Queue"}
        </button>
        <span className="pill">Pending: {rows.length}</span>
      </section>

      <form className="card" onSubmit={submitScore} style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Score Selected Entry</h2>
        <label>
          Entry ID
          <input value={entryId} onChange={(e) => setEntryId(e.target.value)} placeholder="Click a queue row" />
        </label>

        <div className="grid grid-2">
          <label>
            Decision Quality (0-5)
            <input value={dq} onChange={(e) => setDq(e.target.value)} />
          </label>
          <label>
            Financial Logic (0-5)
            <input value={fin} onChange={(e) => setFin(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-2">
          <label>
            Risk Management (0-5)
            <input value={risk} onChange={(e) => setRisk(e.target.value)} />
          </label>
          <label>
            Communication (0-5)
            <input value={comm} onChange={(e) => setComm(e.target.value)} />
          </label>
        </div>

        <label>
          Coach Note
          <textarea value={coachNote} onChange={(e) => setCoachNote(e.target.value)} rows={3} />
        </label>

        <button>Submit Scores</button>
      </form>

      {message ? (
        <section className="card">
          <div className="banner">{message}</div>
        </section>
      ) : null}

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Email</th>
              <th>Claim</th>
              <th>Lesson</th>
              <th>Role</th>
              <th>Decision</th>
              <th>Rationale</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.entry_id} onClick={() => setEntryId(r.entry_id)} style={{ cursor: "pointer" }}>
                <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ""}</td>
                <td>{r.email}</td>
                <td>{r.claim_code}</td>
                <td>{r.lesson_key}</td>
                <td>{r.role}</td>
                <td>{r.decision_text}</td>
                <td>{r.rationale_text}</td>
                <td>{r.outcome_text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
