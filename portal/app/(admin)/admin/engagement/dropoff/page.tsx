"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface DropoffRow {
  email: string;
  display_name: string;
  level: number;
  xp: number;
  inactivity_days: number;
  actions_7d: number;
  reason: string;
}

interface DropoffPayload {
  ok: boolean;
  data: DropoffRow[];
}

export default function AdminEngagementDropoffPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DropoffRow[]>([]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<DropoffPayload>("/api/admin/engagement/dropoff");
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dropoff list");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Engagement Dropoff" subtitle="Students trending down in last 7 days" />

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh dropoff"}
        </button>
        <span className="pill">Flagged Students: {rows.length}</span>
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
              <th>Reason</th>
              <th>Inactivity</th>
              <th>Actions (7d)</th>
              <th>Level</th>
              <th>XP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.email}>
                <td>
                  <div>{row.display_name || row.email}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.email}</div>
                </td>
                <td>{row.reason}</td>
                <td>{row.inactivity_days} days</td>
                <td>{row.actions_7d}</td>
                <td>{row.level}</td>
                <td>{row.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
