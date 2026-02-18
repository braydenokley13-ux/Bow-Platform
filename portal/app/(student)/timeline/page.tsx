"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
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
  xp_earned: "⚡",
  badge_unlocked: "🏅",
  event_attended: "📅",
  assignment_submitted: "📝",
  goal_set: "🎯",
  shoutout_sent: "👏",
  shoutout_received: "🌟",
  checkin: "✅",
  raffle_entered: "🎟",
  quest_completed: "🏆",
  default: "•"
};

function kindIcon(kind: string) {
  return KIND_ICON[kind] ?? KIND_ICON.default;
}

export default function TimelinePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Activity Timeline"
        subtitle="Your personal history — XP, badges, events, goals, and more"
      />

      <section className="card" style={{ display: "flex", gap: 8 }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {!busy && events.length === 0 ? (
        <section className="card">
          <p style={{ margin: 0, opacity: 0.6 }}>No activity recorded yet. Start engaging to see your history here.</p>
        </section>
      ) : null}

      <section className="card" style={{ padding: 0 }}>
        <div style={{ display: "grid" }}>
          {events.map((ev, idx) => (
            <div
              key={ev.event_id}
              style={{
                display: "flex",
                gap: 14,
                padding: "12px 16px",
                borderBottom: idx < events.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none",
                alignItems: "flex-start"
              }}
            >
              <div style={{ fontSize: 20, flexShrink: 0, width: 28, textAlign: "center" }}>
                {kindIcon(ev.kind)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{ev.title}</div>
                {ev.detail ? (
                  <div style={{ fontSize: 13, opacity: 0.65, marginTop: 2 }}>{ev.detail}</div>
                ) : null}
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                {ev.xp_delta != null && ev.xp_delta !== 0 ? (
                  <div
                    style={{
                      fontWeight: 700,
                      color: ev.xp_delta > 0 ? "var(--accent, #2563eb)" : "var(--muted, #6b7280)",
                      fontSize: 14
                    }}
                  >
                    {ev.xp_delta > 0 ? "+" : ""}{ev.xp_delta} XP
                  </div>
                ) : null}
                <div style={{ fontSize: 12, opacity: 0.45, marginTop: 2 }}>
                  {new Date(ev.occurred_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {hasMore ? (
        <section className="card">
          <button className="secondary" onClick={() => void load(true)} disabled={busy}>
            {busy ? "Loading..." : "Load more"}
          </button>
        </section>
      ) : null}
    </div>
  );
}
