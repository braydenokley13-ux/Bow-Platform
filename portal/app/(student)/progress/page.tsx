"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ModuleProgress {
  module_id: string;
  total_lessons: number;
  completed_lessons: number;
}

interface TrackProgress {
  track: string;
  total_lessons: number;
  completed_lessons: number;
  modules: ModuleProgress[];
}

interface ProgressPayload {
  ok: boolean;
  data: {
    tracks: TrackProgress[];
    assignments: Array<Record<string, unknown>>;
  };
}

function pct(done: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

export default function ProgressPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ProgressPayload | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<ProgressPayload>("/api/me/progress");
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-14">
      <PageTitle title="Progress" subtitle="Track and module completion snapshot" />
      <section className="card row-8-center-wrap">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh progress"}
        </button>
        {busy ? <span className="pill">Loading latest data...</span> : null}
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">
            <strong>Progress load failed:</strong> {error}
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={() => void load()} className="secondary">
              Retry
            </button>
          </div>
        </section>
      ) : null}

      {busy && !payload ? (
        <section className="grid grid-2">
          <article className="card">
            <div className="skeleton sk-line" style={{ width: "30%" }} />
            <div className="skeleton sk-title" />
            <div className="skeleton sk-line" style={{ width: "90%" }} />
            <div className="skeleton sk-line" style={{ width: "85%" }} />
          </article>
          <article className="card">
            <div className="skeleton sk-line" style={{ width: "30%" }} />
            <div className="skeleton sk-title" />
            <div className="skeleton sk-line" style={{ width: "90%" }} />
            <div className="skeleton sk-line" style={{ width: "85%" }} />
          </article>
        </section>
      ) : null}

      {(payload?.data.tracks || []).map((track) => (
        <section key={track.track} className="card stack-10">
          <h2 className="title-18">Track {track.track}</h2>
          <div>
            <strong>
              {track.completed_lessons}/{track.total_lessons} lessons completed ({pct(track.completed_lessons, track.total_lessons)}%)
            </strong>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Completed</th>
                  <th>Total</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {track.modules.map((m) => (
                  <tr key={`${track.track}-${m.module_id}`}>
                    <td>{m.module_id}</td>
                    <td>{m.completed_lessons}</td>
                    <td>{m.total_lessons}</td>
                    <td>{pct(m.completed_lessons, m.total_lessons)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="card stack-8">
        <h2 className="title-18">Assignments Snapshot</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Track</th>
                <th>Module</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {(payload?.data.assignments || []).map((a, idx) => (
                <tr key={String(a.assignment_id || idx)}>
                  <td>{String(a.title || "")}</td>
                  <td>{String(a.track || "")}</td>
                  <td>{String(a.module || "")}</td>
                  <td>{String(a.status || "")}</td>
                  <td>{String(a.due_at || "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
