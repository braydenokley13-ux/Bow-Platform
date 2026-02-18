"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface AtRiskRow {
  email: string;
  display_name: string;
  xp_velocity_7d: number;
  claim_fail_rate_7d: number;
  rubric_overall_avg: number;
  inactivity_days: number;
  risk_score: number;
  risk_tier: "ENGAGED" | "WATCH" | "AT_RISK";
  weakest_dimension: string;
  drivers: string[];
}

interface AtRiskPayload {
  ok: boolean;
  data: {
    lookback_days: number;
    summary: {
      at_risk: number;
      watch: number;
      engaged: number;
    };
    rows: AtRiskRow[];
  };
}

export default function AdminAtRiskPage() {
  const [lookbackDays, setLookbackDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AtRiskPayload["data"]["summary"] | null>(null);
  const [rows, setRows] = useState<AtRiskRow[]>([]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const days = Math.max(1, Number(lookbackDays || "7"));
      const json = await apiFetch<AtRiskPayload>(
        `/api/admin/analytics/at-risk?lookback_days=${encodeURIComponent(String(days))}`
      );
      setSummary(json.data.summary);
      setRows(json.data.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load at-risk analytics");
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
      <PageTitle title="At-Risk Segmentation" subtitle="Prioritize who needs intervention now" />

      <form className="card" onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <div className="grid grid-2">
          <label>
            Lookback Days
            <input
              value={lookbackDays}
              onChange={(e) => setLookbackDays(e.target.value)}
              placeholder="7"
            />
          </label>
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <button disabled={busy}>{busy ? "Loading..." : "Refresh"}</button>
          </div>
        </div>
        {summary ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill">At Risk: {summary.at_risk}</span>
            <span className="pill">Watch: {summary.watch}</span>
            <span className="pill">Engaged: {summary.engaged}</span>
          </div>
        ) : null}
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
              <th>Student</th>
              <th>Tier</th>
              <th>Risk Score</th>
              <th>Inactivity</th>
              <th>XP Velocity (7d)</th>
              <th>Claim Fail Rate</th>
              <th>Rubric Avg</th>
              <th>Weakest Dimension</th>
              <th>Drivers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email}>
                <td>
                  <div>{r.display_name}</div>
                  <div className="muted-12">{r.email}</div>
                </td>
                <td>
                  <span className="pill">{r.risk_tier}</span>
                </td>
                <td>{r.risk_score}</td>
                <td>{r.inactivity_days}d</td>
                <td>{r.xp_velocity_7d}</td>
                <td>{(r.claim_fail_rate_7d * 100).toFixed(1)}%</td>
                <td>{r.rubric_overall_avg.toFixed(2)}</td>
                <td>{r.weakest_dimension || "-"}</td>
                <td className="max-w-320">{(r.drivers || []).join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
