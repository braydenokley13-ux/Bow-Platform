"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { EmptyState } from "@/components/empty-state";
import { apiFetch } from "@/lib/client-api";
import type { ActivityItem } from "@/types/portal";

interface ActivitiesResponse {
  ok: boolean;
  data: ActivityItem[];
}

const TRACKS = ["101", "201", "301"] as const;

export default function ActivitiesPage() {
  const [track, setTrack] = useState("101");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ActivityItem[]>([]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ActivitiesResponse>(`/api/activities?track=${encodeURIComponent(track)}`);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setBusy(false);
    }
  }, [track]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const byModule: Record<string, ActivityItem[]> = {};
    items.forEach((item) => {
      if (!byModule[item.module_id]) byModule[item.module_id] = [];
      byModule[item.module_id].push(item);
    });
    return Object.entries(byModule).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  return (
    <div className="grid gap-14">
      <PageTitle title="Activities" subtitle="Pick a track and start earning XP" />

      <section className="card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TRACKS.map((t) => (
            <button
              key={t}
              onClick={() => setTrack(t)}
              className={track === t ? "" : "secondary"}
              disabled={busy}
            >
              Track {t}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {busy && !items.length ? (
        <section className="card">
          <p className="m-0 text-muted">Loading activities...</p>
        </section>
      ) : grouped.length ? (
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
                    <th>Link</th>
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
                        <td>
                          {item.activity_url ? (
                            <a href={item.activity_url} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          ) : (
                            <span style={{ opacity: 0.4 }}>—</span>
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
        <EmptyState title="No activities found" body="Try a different track." />
      )}
    </div>
  );
}
