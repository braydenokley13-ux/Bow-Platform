"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
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
  session: "Session",
  deadline: "Deadline",
  event: "Event",
  office_hours: "Office Hours"
};

const KIND_COLORS: Record<string, string> = {
  session: "#2563eb",
  deadline: "#dc2626",
  event: "#7c3aed",
  office_hours: "#059669"
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
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function CalendarPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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
  const filtered = filterKind === "all" ? events : events.filter((e) => e.kind === filterKind);
  const upcoming = filtered.filter((e) => new Date(e.starts_at) >= now);
  const past = filtered.filter((e) => new Date(e.starts_at) < now);
  const grouped = groupByMonth(upcoming);
  const kinds = Array.from(new Set(events.map((e) => e.kind)));

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Program Calendar" subtitle="Upcoming sessions, deadlines, events, and office hours" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}

      <section className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className={filterKind === "all" ? "" : "secondary"} onClick={() => setFilterKind("all")}>All</button>
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
        <button className="secondary" style={{ marginLeft: "auto" }} onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>
      </section>

      {upcoming.length === 0 && !busy ? (
        <section className="card">
          <p style={{ margin: 0, opacity: 0.6 }}>
            No upcoming events{filterKind !== "all" ? ` of type "${kindLabel(filterKind)}"` : ""}.
          </p>
        </section>
      ) : null}

      {Array.from(grouped.entries()).map(([month, evs]) => (
        <section key={month} className="card" style={{ padding: 0 }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border, #e5e7eb)", fontWeight: 700, fontSize: 15 }}>
            {monthLabel(month)}
          </div>
          {evs.map((ev, idx) => {
            const d = new Date(ev.starts_at);
            const isToday = d.toDateString() === now.toDateString();
            return (
              <div
                key={ev.event_id}
                style={{
                  display: "grid", gridTemplateColumns: "56px 1fr",
                  borderBottom: idx < evs.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none",
                  background: isToday ? "var(--accent-soft, #eff6ff)" : undefined
                }}
              >
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "12px 4px", borderRight: "3px solid " + kindColor(ev.kind)
                }}>
                  <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</span>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                </div>
                <div style={{ padding: "12px 14px", display: "grid", gap: 3 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 99,
                      background: kindColor(ev.kind) + "22", color: kindColor(ev.kind)
                    }}>
                      {kindLabel(ev.kind)}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{ev.title}</span>
                    {isToday ? <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 700 }}>TODAY</span> : null}
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.55 }}>
                    {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    {ev.ends_at ? ` – ${new Date(ev.ends_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : ""}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </div>
                  {ev.notes ? <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>{ev.notes}</p> : null}
                  {ev.meeting_url ? (
                    <a href={ev.meeting_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#2563eb" }}>
                      Join meeting →
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {past.length > 0 ? (
        <details>
          <summary style={{ cursor: "pointer", padding: "8px 0", opacity: 0.55, fontSize: 13 }}>
            {past.length} past event{past.length !== 1 ? "s" : ""}
          </summary>
          <div className="grid" style={{ gap: 6, marginTop: 8 }}>
            {past.map((ev) => (
              <div key={ev.event_id} className="card" style={{ opacity: 0.55, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 99, background: "#e5e7eb" }}>
                  {kindLabel(ev.kind)}
                </span>
                <span style={{ fontSize: 14 }}>{ev.title}</span>
                <span style={{ fontSize: 12, marginLeft: "auto" }}>
                  {new Date(ev.starts_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
