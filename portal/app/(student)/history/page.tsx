"use client";

import { useEffect, useState, useCallback } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface ActivityEvent {
  ts: string;
  kind?: string;
  title?: string;
  detail?: string;
}

interface HistoryPayload {
  ok: boolean;
  data: ActivityEvent[];
}

export default function HistoryPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<HistoryPayload>("/api/activity-history");
      setEvents(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity history");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="grid gap-14">
      <PageTitle title="My Activity History" subtitle="Claims, raffle entries, and notification events" />

      {error ? <FeedbackBanner kind="error">{error}</FeedbackBanner> : null}

      {busy ? (
        <LoadingSkeleton lines={6} />
      ) : events.length === 0 ? (
        <EmptyState title="No history yet" body="Your activity will appear here after you complete lessons and claim XP." />
      ) : (
        <section className="card" style={{ padding: 0 }}>
          <DataTable headers={["Date", "Kind", "Event", "Detail"]} stickyHeader>
            {events.map((ev, idx) => (
              <tr key={`${ev.ts}-${idx}`}>
                <td style={{ whiteSpace: "nowrap", fontSize: 13 }}>
                  {new Date(ev.ts).toLocaleString()}
                </td>
                <td>
                  {ev.kind ? <span className="pill" style={{ fontSize: 11 }}>{ev.kind}</span> : "—"}
                </td>
                <td style={{ fontWeight: 500 }}>{ev.title ?? "—"}</td>
                <td style={{ fontSize: 13, opacity: 0.65 }}>{ev.detail ?? "—"}</td>
              </tr>
            ))}
          </DataTable>
        </section>
      )}
    </div>
  );
}
