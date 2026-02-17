"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface JournalRow {
  entry_id: string;
  claim_code: string;
  program_id: string;
  module_id: string;
  lesson_id: number;
  lesson_key: string;
  role: string;
  decision_text: string;
  rationale_text: string;
  outcome_text: string;
  status: string;
  submitted_at: string;
  scored_at?: string;
  score_decision_quality?: number;
  score_financial_logic?: number;
  score_risk_management?: number;
  score_communication?: number;
  coach_note?: string;
}

export default function StudentJournalPage() {
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [claimCode, setClaimCode] = useState("");
  const [programId, setProgramId] = useState("PRG_BOW_TIER1");
  const [role, setRole] = useState("Front Office Analyst");
  const [decisionText, setDecisionText] = useState("");
  const [rationaleText, setRationaleText] = useState("");
  const [outcomeText, setOutcomeText] = useState("");

  async function load() {
    setBusy(true);
    setMessage("");
    try {
      const json = await apiFetch<Envelope<JournalRow[]>>("/api/me/journal");
      setRows(json.data || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load journal entries");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitJournal(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    try {
      await apiFetch("/api/me/journal", {
        method: "POST",
        json: {
          claim_code: claimCode,
          program_id: programId,
          role,
          decision_text: decisionText,
          rationale_text: rationaleText,
          outcome_text: outcomeText
        }
      });
      setClaimCode("");
      setDecisionText("");
      setRationaleText("");
      setOutcomeText("");
      setMessage("Decision journal submitted.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Journal submission failed");
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Decision Journal" subtitle="Submit your decision evidence after a verified claim code completion" />

      <form className="card" onSubmit={submitJournal} style={{ display: "grid", gap: 10 }}>
        <div className="grid grid-2">
          <label>
            Claim Code
            <input value={claimCode} onChange={(e) => setClaimCode(e.target.value)} required />
          </label>
          <label>
            Program ID
            <input value={programId} onChange={(e) => setProgramId(e.target.value)} />
          </label>
        </div>

        <label>
          Role
          <input value={role} onChange={(e) => setRole(e.target.value)} required />
        </label>

        <label>
          Decision (what you chose)
          <textarea value={decisionText} onChange={(e) => setDecisionText(e.target.value)} rows={3} required />
        </label>

        <label>
          Financial / strategic rationale (why)
          <textarea value={rationaleText} onChange={(e) => setRationaleText(e.target.value)} rows={3} required />
        </label>

        <label>
          Outcome reflection (what happened + what you would change)
          <textarea value={outcomeText} onChange={(e) => setOutcomeText(e.target.value)} rows={3} required />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button>Submit Journal Entry</button>
          <button type="button" className="secondary" onClick={() => void load()} disabled={busy}>
            {busy ? "Refreshing..." : "Refresh Entries"}
          </button>
        </div>
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
              <th>Claim Code</th>
              <th>Role</th>
              <th>Status</th>
              <th>DQ</th>
              <th>Financial</th>
              <th>Risk</th>
              <th>Communication</th>
              <th>Coach Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.entry_id}>
                <td>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ""}</td>
                <td>{r.claim_code}</td>
                <td>{r.role}</td>
                <td>{r.status}</td>
                <td>{r.score_decision_quality ?? "-"}</td>
                <td>{r.score_financial_logic ?? "-"}</td>
                <td>{r.score_risk_management ?? "-"}</td>
                <td>{r.score_communication ?? "-"}</td>
                <td>{r.coach_note || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
