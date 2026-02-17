"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface TemplateRow {
  template_id: string;
  dimension: string;
  title: string;
  message_template: string;
  next_steps: string;
  sort_order: number;
}

export default function AdminInterventionTemplatesPage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<Envelope<TemplateRow[]>>("/api/admin/interventions/templates");
      setRows(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load intervention templates");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Intervention Templates" subtitle="Ready-to-use instructor coaching prompts by weakness dimension" />

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh"}
        </button>
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
              <th>ID</th>
              <th>Dimension</th>
              <th>Title</th>
              <th>Message Template</th>
              <th>Next Steps</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.template_id}>
                <td>{r.template_id}</td>
                <td>{r.dimension}</td>
                <td>{r.title}</td>
                <td>{r.message_template}</td>
                <td>{r.next_steps}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
