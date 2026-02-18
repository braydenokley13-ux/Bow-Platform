"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

type EventKind = "session" | "deadline" | "event" | "office_hours" | string;

interface CalendarEvent {
  event_id: string;
  title: string;
  kind: EventKind;
  starts_at: string;
  ends_at?: string;
  location?: string;
  meeting_url?: string;
  notes?: string;
}

interface CalendarPayload {
  ok: boolean;
  data: CalendarEvent[];
}

const KIND_LABELS: Record<string, string> = {
  session:      "Session",
  deadline:     "Deadline",
  event:        "Event",
  office_hours: "Office Hours",
};

const KIND_COLORS: Record<string, string> = {
  session:      "#2563eb",
  deadline:     "#dc2626",
  event:        "#7c3aed",
  office_hours: "#059669",
};

function kindColor(kind: string) { return KIND_COLORS[kind] ?? "#6b7280"; }
function kindLabel(kind: string) { return KIND_LABELS[kind] ?? kind; }

function groupByMonth(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const d = new Date(ev.starts_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return map;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    month: "long", year: "numeric",
  });
}

export default function CalendarPage() {
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [events, setEvents]       = useState<CalendarEvent[]>([]);
  const [filterKind, setFilterKind] = useState<string>("all");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<CalendarPayload>("/api/calendar");
      const sorted = (res.data ?? []).sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
      setEvents(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const now = new Date();
  const filtered  = filterKind === "all" ? events : events.filter((e) => e.kind === filterKind);
  const upcoming  = filtered.filter((e) => new Date(e.starts_at) >= now);
  const past      = filtered.filter((e) => new Date(e.starts_at) < now);
  const grouped   = groupByMonth(upcoming);
  const kinds     = Array.from(new Set(events.map((e) => e.kind)));

  return (
    <div className="grid gap-5">
      <PageTitle
        title="Program Calendar"
        subtitle="Upcoming sessions, deadlines, events, and office hours"
      />

      <div className="action-bar flex-wrap">
        <button
          className={filterKind === "all" ? "" : "secondary"}
          onClick={() => setFilterKind("all")}
        >
          All
        </button>
        {kinds.map((k) => (
          <button
            key={k}
            className={filterKind === k ? "" : "secondary"}
            onClick={() => setFilterKind(k)}
            style={{ borderColor: kindColor(k), color: filterKind === k ? undefined : kindColor(k) }}
          >
            {kindLabel(k)}
          </button>
        ))}
        <button
          className="secondary"
          style={{ marginLeft: "auto" }}
          onClick={() => void load()}
          disabled={busy}
        >
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {busy && events.length === 0 && (
        <section className="card"><LoadingSkeleton lines={6} /></section>
      )}

      {!busy && upcoming.length === 0 && (
        <div className="empty-state">
          <h3>No upcoming events{filterKind !== "all" ? ` of type "${kindLabel(filterKind)}"` : ""}</h3>
          <p>Check back later or switch the filter above.</p>
        </div>
      )}

      {Array.from(grouped.entries()).map(([month, evs]) => (
        <section key={month} className="card" style={{ padding: 0 }}>
          <div className="cal-month-header">{monthLabel(month)}</div>
          {evs.map((ev) => {
            const d = new Date(ev.starts_at);
            const isToday = d.toDateString() === now.toDateString();
            return (
              <div key={ev.event_id} className={`cal-row${isToday ? " today" : ""}`}>
                <div
                  className="cal-date-col"
                  style={{ borderRight: `3px solid ${kindColor(ev.kind)}` }}
                >
                  <span className="cal-date-num">{d.getDate()}</span>
                  <span className="cal-date-day">
                    {d.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                </div>
                <div className="cal-event-col">
                  <div className="cal-event-meta">
                    <span
                      className="cal-kind-pill"
                      style={{
                        background: kindColor(ev.kind) + "22",
                        color: kindColor(ev.kind),
                      }}
                    >
                      {kindLabel(ev.kind)}
                    </span>
                    <span className="cal-event-title">{ev.title}</span>
                    {isToday && <span className="cal-today-badge">TODAY</span>}
                  </div>
                  <div className="cal-event-time">
                    {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    {ev.ends_at
                      ? ` – ${new Date(ev.ends_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </div>
                  {ev.notes && (
                    <p className="text-muted text-sm m-0">{ev.notes}</p>
                  )}
                  {ev.meeting_url && (
                    <a href={ev.meeting_url} target="_blank" rel="noopener noreferrer" className="text-sm">
                      Join meeting →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {past.length > 0 && (
        <details>
          <summary className="cal-past-summary">
            {past.length} past event{past.length !== 1 ? "s" : ""}
          </summary>
          <div className="grid gap-2" style={{ marginTop: 8 }}>
            {past.map((ev) => (
              <div key={ev.event_id} className="card cal-past-row" style={{ padding: "10px 14px" }}>
                <span className="cal-past-kind">{kindLabel(ev.kind)}</span>
                <span className="text-sm">{ev.title}</span>
                <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>
                  {new Date(ev.starts_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
