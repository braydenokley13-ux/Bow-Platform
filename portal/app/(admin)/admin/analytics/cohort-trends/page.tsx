"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface CohortTrendRow {
  week: string;
  xp_total: number;
  claims_success: number;
  claims_fail: number;
  claim_fail_rate: number;
  rubric_overall_avg: number;
  rubric_count: number;
}

interface CohortTrendPayload {
  ok: boolean;
  data: {
    weeks_back: number;
    series: CohortTrendRow[];
  };
}

export default function AdminCohortTrendsPage() {
  const [weeksBack, setWeeksBack] = useState("8");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CohortTrendRow[]>([]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const weeks = Math.max(4, Math.min(26, Number(weeksBack || "8")));
      const json = await apiFetch<CohortTrendPayload>(
        `/api/admin/analytics/cohort-trends?weeks_back=${encodeURIComponent(String(weeks))}`
      );
      setRows(json.data.series || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cohort trends");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Cohort Trends" subtitle="Weekly trendline for XP, claim reliability, and rubric quality" />

      <form className="card stack-10" onSubmit={onSubmit}>
        <div className="grid grid-2">
          <label>
            Weeks Back (4-26)
            <input value={weeksBack} onChange={(e) => setWeeksBack(e.target.value)} />
          </label>
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <button disabled={busy}>{busy ? "Loading..." : "Refresh"}</button>
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
              <th>XP Total</th>
              <th>Claim Success</th>
              <th>Claim Fail</th>
              <th>Fail Rate</th>
              <th>Rubric Avg</th>
              <th>Rubric Samples</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.week}>
                <td>{r.week}</td>
                <td>{r.xp_total}</td>
                <td>{r.claims_success}</td>
                <td>{r.claims_fail}</td>
                <td>{(r.claim_fail_rate * 100).toFixed(1)}%</td>
                <td>{r.rubric_overall_avg.toFixed(2)}</td>
                <td>{r.rubric_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
