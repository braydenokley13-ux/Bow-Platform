"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

interface TimelineEvent {
  event_id: string;
  kind: string;
  title: string;
  detail?: string;
  xp_delta?: number;
  occurred_at: string;
}

interface TimelinePayload {
  ok: boolean;
  data: {
    events: TimelineEvent[];
    cursor?: string;
    has_more?: boolean;
  };
}

const KIND_ICON: Record<string, string> = {
  xp_earned:            "⚡",
  badge_unlocked:       "🏅",
  event_attended:       "📅",
  assignment_submitted: "📝",
  goal_set:             "🎯",
  shoutout_sent:        "👏",
  shoutout_received:    "🌟",
  checkin:              "✅",
  raffle_entered:       "🎟",
  quest_completed:      "🏆",
  default:              "•",
};

function kindIcon(kind: string) {
  return KIND_ICON[kind] ?? KIND_ICON.default;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function TimelinePage() {
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  async function load(append = false) {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (append && cursor) params.set("cursor", cursor);

      const res = await apiFetch<TimelinePayload>(
        `/api/me/activity-timeline?${params.toString()}`
      );
      const incoming = res.data.events ?? [];
      setEvents((prev) => (append ? [...prev, ...incoming] : incoming));
      setCursor(res.data.cursor);
      setHasMore(res.data.has_more ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timeline");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="grid gap-5">
      <PageTitle
        title="Activity Timeline"
        subtitle="Your personal history — XP, badges, events, goals, and more"
      />

      <div className="action-bar">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="banner banner-error">{error}</div>
      )}

      {busy && events.length === 0 && (
        <section className="card">
          <LoadingSkeleton lines={6} />
        </section>
      )}

      {!busy && events.length === 0 && !error && (
        <div className="empty-state">
          <h3>No activity yet</h3>
          <p>Start engaging to see your history here.</p>
        </div>
      )}

      {events.length > 0 && (
        <div className="table-wrap">
          <div className="feed-list">
            {events.map((ev) => (
              <div key={ev.event_id} className="feed-row">
                <div className="feed-icon">{kindIcon(ev.kind)}</div>
                <div className="feed-body">
                  <p className="feed-title">{ev.title}</p>
                  {ev.detail && <p className="feed-detail">{ev.detail}</p>}
                </div>
                <div className="feed-meta">
                  {ev.xp_delta != null && ev.xp_delta !== 0 && (
                    <span className="xp-badge">
                      {ev.xp_delta > 0 ? "+" : ""}{ev.xp_delta} XP
                    </span>
                  )}
                  <span className="feed-time">{fmt(ev.occurred_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMore && (
        <div className="action-bar">
          <button className="secondary" onClick={() => void load(true)} disabled={busy}>
            {busy ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
