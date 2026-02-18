"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface TrendRow {
  week: string;
  count: number;
  avg_decision_quality: number;
  avg_financial_logic: number;
  avg_risk_management: number;
  avg_communication: number;
  overall_avg: number;
}

export default function AdminDecisionTrendsPage() {
  const [emailFilter, setEmailFilter] = useState("");
  const [rows, setRows] = useState<TrendRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const query = emailFilter ? `?email=${encodeURIComponent(emailFilter)}` : "";
      const json = await apiFetch<Envelope<TrendRow[]>>(`/api/admin/analytics/decision-trends${query}`);
      setRows(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load decision trends");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFilter(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Decision Quality Trends" subtitle="Weekly rubric trendlines across scored journal entries" />

      <form className="card" onSubmit={onFilter} style={{ display: "grid", gap: 10 }}>
        <div className="grid grid-2">
          <label>
            Student Email (optional)
            <input
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="student@school.edu"
            />
          </label>
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <button disabled={busy}>{busy ? "Loading..." : "Apply Filter"}</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEmailFilter("");
                void load();
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Samples</th>
              <th>DQ</th>
              <th>Financial</th>
              <th>Risk</th>
              <th>Communication</th>
              <th>Overall</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.week}>
                <td>{r.week}</td>
                <td>{r.count}</td>
                <td>{r.avg_decision_quality.toFixed(2)}</td>
                <td>{r.avg_financial_logic.toFixed(2)}</td>
                <td>{r.avg_risk_management.toFixed(2)}</td>
                <td>{r.avg_communication.toFixed(2)}</td>
                <td>
                  <span className="pill">{r.overall_avg.toFixed(2)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
