"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface Recommendation {
  track: string;
  module_id: string;
  lesson_id: number;
  lesson_title: string;
  activity_url: string;
  reason: string;
  priority: number;
}

interface RecommendationPayload {
  weakest_dimension: string;
  averages: {
    decision_quality: number;
    financial_logic: number;
    risk_management: number;
    communication: number;
  };
  recommendations: Recommendation[];
}

export default function StudentRecommendedPage() {
  const [track, setTrack] = useState("");
  const [payload, setPayload] = useState<RecommendationPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (track) query.set("track", track);
      query.set("limit", "8");
      const json = await apiFetch<Envelope<RecommendationPayload>>(
        `/api/me/recommendations/next-lessons?${query.toString()}`
      );
      setPayload(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recommendations");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-14">
      <PageTitle title="Recommended Next Lessons" subtitle="Auto next-best-lesson guidance based on your weakest rubric dimension" />

      <section className="card stack-10">
        <div className="grid grid-2">
          <label>
            Track Filter (optional)
            <select value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="">All Tracks</option>
              <option value="101">101</option>
              <option value="201">201</option>
              <option value="301">301</option>
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={() => void load()} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh Recommendations"}
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {payload ? (
        <section className="card stack-8">
          <h2 className="title-18">Your Coaching Focus</h2>
          <div className="pill">Weakest Dimension: {payload.weakest_dimension}</div>
          <div className="grid grid-2">
            <div className="pill">DQ: {payload.averages.decision_quality.toFixed(2)}</div>
            <div className="pill">Financial: {payload.averages.financial_logic.toFixed(2)}</div>
            <div className="pill">Risk: {payload.averages.risk_management.toFixed(2)}</div>
            <div className="pill">Communication: {payload.averages.communication.toFixed(2)}</div>
          </div>
        </section>
      ) : null}

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Track</th>
              <th>Module</th>
              <th>Lesson</th>
              <th>Why This</th>
              <th>Activity</th>
            </tr>
          </thead>
          <tbody>
            {(payload?.recommendations || []).map((r) => (
              <tr key={`${r.track}-${r.module_id}-${r.lesson_id}`}>
                <td>{r.priority}</td>
                <td>{r.track}</td>
                <td>{r.module_id}</td>
                <td>{r.lesson_title || `Lesson ${r.lesson_id}`}</td>
                <td>{r.reason}</td>
                <td>
                  {r.activity_url ? (
                    <a href={r.activity_url} target="_blank" rel="noreferrer">
                      Open Activity
                    </a>
                  ) : (
                    "No link"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
