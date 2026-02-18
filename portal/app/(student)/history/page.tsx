"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

interface HistoryEvent {
  event_id: string;
  kind: string;
  title: string;
  detail?: string;
  xp_delta?: number;
  occurred_at: string;
}

interface HistoryPayload {
  ok: boolean;
  data: {
    events?: HistoryEvent[];
    claims?: HistoryEvent[];
    entries?: HistoryEvent[];
    items?: HistoryEvent[];
  };
}

const KIND_ICON: Record<string, string> = {
  claim:                "✅",
  raffle_entry:         "🎟",
  raffle_win:           "🎉",
  event_attended:       "📅",
  assignment_submitted: "📝",
  badge_unlocked:       "🏅",
  xp_earned:            "⚡",
  quest_completed:      "🏆",
  checkin:              "🔑",
  goal_set:             "🎯",
  kudos_sent:           "👏",
  kudos_received:       "🌟",
};

const KIND_LABEL: Record<string, string> = {
  claim:                "Claim",
  raffle_entry:         "Raffle",
  raffle_win:           "Win",
  event_attended:       "Event",
  assignment_submitted: "Assignment",
  badge_unlocked:       "Badge",
  xp_earned:            "XP",
  quest_completed:      "Quest",
  checkin:              "Check-in",
  goal_set:             "Goal",
  kudos_sent:           "Kudos",
  kudos_received:       "Kudos",
};

function icon(k: string) { return KIND_ICON[k] ?? "•"; }
function label(k: string) { return KIND_LABEL[k] ?? k.replace(/_/g, " "); }

function pillClass(k: string) {
  if (["xp_earned", "badge_unlocked", "quest_completed", "raffle_win"].includes(k)) return "pill pill-brand";
  if (["kudos_received", "event_attended", "checkin", "claim"].includes(k)) return "pill pill-success";
  if (["raffle_entry", "goal_set"].includes(k)) return "pill pill-warn";
  return "pill";
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function normalise(payload: HistoryPayload): HistoryEvent[] {
  const d = payload.data;
  return d.events ?? d.claims ?? d.entries ?? d.items ?? [];
}

export default function HistoryPage() {
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [filter, setFilter] = useState("all");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<HistoryPayload>("/api/activity-history");
      setEvents(normalise(res));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const kinds = Array.from(new Set(events.map((e) => e.kind))).sort();
  const visible = filter === "all" ? events : events.filter((e) => e.kind === filter);

  return (
    <div className="grid gap-5">
      <PageTitle
        title="My Activity History"
        subtitle="Claims, raffle entries, events, and all earned XP"
      />

      <div className="filter-bar">
        <button className="secondary" onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: "auto" }}
        >
          <option value="all">All types</option>
          {kinds.map((k) => (
            <option key={k} value={k}>{label(k)}</option>
          ))}
        </select>
        {events.length > 0 && (
          <span className="pill">{visible.length} event{visible.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {busy && events.length === 0 && (
        <section className="card">
          <LoadingSkeleton lines={6} />
        </section>
      )}

      {!busy && events.length === 0 && !error && (
        <div className="empty-state">
          <h3>No history yet</h3>
          <p>Complete activities, attend events, or submit assignments to build your history.</p>
        </div>
      )}

      {!busy && filter !== "all" && visible.length === 0 && events.length > 0 && (
        <div className="empty-state">
          <h3>No {label(filter)} events</h3>
          <p>Switch the filter to "All types" to see everything.</p>
        </div>
      )}

      {visible.length > 0 && (
        <div className="table-wrap">
          <div className="feed-list">
            {visible.map((ev) => (
              <div key={ev.event_id} className="feed-row">
                <div className="feed-icon">{icon(ev.kind)}</div>
                <div className="feed-body">
                  <p className="feed-title">{ev.title}</p>
                  {ev.detail && <p className="feed-detail">{ev.detail}</p>}
                </div>
                <div className="feed-meta">
                  <span className={pillClass(ev.kind)}>{label(ev.kind)}</span>
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
    </div>
  );
}
