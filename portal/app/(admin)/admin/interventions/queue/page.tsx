"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface QueueRow {
  email: string;
  display_name: string;
  risk_tier: string;
  risk_score: number;
  inactivity_days: number;
  weakest_dimension: string;
  drivers: string[];
  priority_score: number;
  recommended_template_id: string;
  recommended_title: string;
  recommended_message: string;
  next_steps: string;
}

interface QueuePayload {
  ok: boolean;
  data: {
    total: number;
    queue: QueueRow[];
  };
}

export default function AdminInterventionQueuePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<QueueRow[]>([]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<QueuePayload>("/api/admin/analytics/intervention-queue");
      setTotal(json.data.total || 0);
      setRows(json.data.queue || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load intervention queue");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-14">
      <PageTitle title="Intervention Queue" subtitle="Ranked student coaching priorities with recommended message templates" />

      <section className="card row-8-center-wrap">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh queue"}
        </button>
        <span className="pill">Students queued: {total}</span>
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
              <th>Student</th>
              <th>Tier</th>
              <th>Priority</th>
              <th>Risk Score</th>
              <th>Inactivity</th>
              <th>Weakest Dimension</th>
              <th>Drivers</th>
              <th>Template</th>
              <th>Suggested Message</th>
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
                <td>{r.priority_score}</td>
                <td>{r.risk_score}</td>
                <td>{r.inactivity_days}d</td>
                <td>{r.weakest_dimension || "-"}</td>
                <td style={{ maxWidth: 260 }}>{(r.drivers || []).join(", ") || "-"}</td>
                <td>
                  {r.recommended_title || "-"}
                  {r.recommended_template_id ? (
                    <div className="muted-12">{r.recommended_template_id}</div>
                  ) : null}
                </td>
                <td style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>
                  {r.recommended_message}
                  {r.next_steps ? (
                    <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
                      Next: {r.next_steps}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
