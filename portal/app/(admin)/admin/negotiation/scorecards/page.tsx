"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface Scorecard {
  entry_id: string;
  email: string;
  role: string;
  module_id: string;
  lesson_key: string;
  lesson_title: string;
  score_decision_quality: number;
  score_financial_logic: number;
  score_risk_management: number;
  score_communication: number;
  coach_note: string;
  scored_at: string;
}

export default function AdminNegotiationScorecardsPage() {
  const [rows, setRows] = useState<Scorecard[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<Envelope<Scorecard[]>>("/api/admin/negotiation/scorecards");
      setRows(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load negotiation scorecards");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-14">
      <PageTitle title="Negotiation Scorecards" subtitle="Coach-note history and rubric performance for negotiation scenarios" />

      <section className="card row-8">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh"}
        </button>
        <span className="pill">Entries: {rows.length}</span>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Email</th>
              <th>Role</th>
              <th>Lesson</th>
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
                <td>{r.scored_at ? new Date(r.scored_at).toLocaleString() : ""}</td>
                <td>{r.email}</td>
                <td>{r.role}</td>
                <td>{r.lesson_title || r.lesson_key}</td>
                <td>{r.score_decision_quality}</td>
                <td>{r.score_financial_logic}</td>
                <td>{r.score_risk_management}</td>
                <td>{r.score_communication}</td>
                <td>{r.coach_note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
