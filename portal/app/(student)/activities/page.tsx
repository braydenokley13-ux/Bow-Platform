"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";
import type { ActivityItem } from "@/types/portal";

interface ActivitiesResponse {
  ok: boolean;
  data: ActivityItem[];
}

export default function ActivitiesPage() {
  const [track, setTrack] = useState("101");
  const [moduleId, setModuleId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const endpoint = `/api/activities?track=${encodeURIComponent(track)}&module=${encodeURIComponent(moduleId)}`;
      const res = await apiFetch<ActivitiesResponse>(endpoint);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, [track, moduleId]);

  const grouped = useMemo(() => {
    const byModule: Record<string, ActivityItem[]> = {};
    items.forEach((item) => {
      const key = item.module_id;
      if (!byModule[key]) byModule[key] = [];
      byModule[key].push(item);
    });

    return Object.entries(byModule).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  return (
    <div className="grid gap-14">
      <PageTitle title="Activities & Modules" subtitle="Browse track content and launch lesson links" />

      <section className="card stack-10">
        <div className="grid grid-2">
          <label>
            Track
            <select value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="101">101</option>
              <option value="201">201</option>
              <option value="301">301</option>
            </select>
          </label>
          <label>
            Module filter (optional)
            <input
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              placeholder="e.g. 1 or GAUNTLET"
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => void load()} disabled={busy}>
            {busy ? "Loading..." : "Refresh activities"}
          </button>
          {error ? <span style={{ color: "var(--danger)" }}>{error}</span> : null}
        </div>
      </section>

      {grouped.length ? (
        grouped.map(([moduleKey, rows]) => (
          <section key={moduleKey} className="card stack-8">
            <h2 className="title-18">Module {moduleKey}</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Lesson</th>
                    <th>Title</th>
                    <th>XP</th>
                    <th>Next</th>
                    <th>Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .sort((a, b) => a.lesson_id - b.lesson_id)
                    .map((item) => (
                      <tr key={`${item.track}-${item.module_id}-${item.lesson_id}`}>
                        <td>{item.lesson_id}</td>
                        <td>{item.lesson_title}</td>
                        <td>{item.xp_value}</td>
                        <td>{item.next_lesson_id || "-"}</td>
                        <td>
                          {item.activity_url ? (
                            <a href={item.activity_url} target="_blank" rel="noreferrer">
                              Open lesson
                            </a>
                          ) : (
                            "No link"
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      ) : (
        <section className="card">
          <p className="m-0">No activities found for the selected filters.</p>
        </section>
      )}
    </div>
  );
}
