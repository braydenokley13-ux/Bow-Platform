"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface HeatRow {
  module_id: string;
  module_title: string;
  core_competency: string;
  count: number;
  avg_decision_quality: number;
  avg_financial_logic: number;
  avg_risk_management: number;
  avg_communication: number;
  overall_avg: number;
}

function heatColor(v: number) {
  if (v >= 4.2) return "#1b8f4b";
  if (v >= 3.4) return "#4ca35d";
  if (v >= 2.6) return "#d8a018";
  return "#bf3a2a";
}

export default function AdminMasteryAnalyticsPage() {
  const [rows, setRows] = useState<HeatRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<Envelope<HeatRow[]>>("/api/admin/analytics/mastery-heatmap");
      setRows(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mastery heatmap");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Framework Mastery Heatmap" subtitle="Module-level competency signal from scored decision journals" />

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh"}
        </button>
        <span className="pill">Rows: {rows.length}</span>
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
              <th>Module</th>
              <th>Title</th>
              <th>Competency</th>
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
              <tr key={r.module_id}>
                <td>{r.module_id}</td>
                <td>{r.module_title}</td>
                <td>{r.core_competency}</td>
                <td>{r.count}</td>
                <td>{r.avg_decision_quality}</td>
                <td>{r.avg_financial_logic}</td>
                <td>{r.avg_risk_management}</td>
                <td>{r.avg_communication}</td>
                <td>
                  <span
                    className="pill"
                    style={{
                      borderColor: "transparent",
                      color: "#fff",
                      background: heatColor(r.overall_avg)
                    }}
                  >
                    {r.overall_avg.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
