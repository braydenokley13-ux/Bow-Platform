"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface EngagementOverviewPayload {
  ok: boolean;
  data: {
    window_days: number;
    totals: {
      active_students: number;
      claims_submitted: number;
      journals_submitted: number;
      events_participated: number;
      quests_completed: number;
      kudos_sent: number;
    };
    active_season: {
      season_id: string;
      title: string;
      status: string;
      starts_at: string;
      ends_at: string;
    } | null;
    active_events: Array<{
      event_id: string;
      title: string;
      track: string;
      module: string;
      already_submitted: boolean;
    }>;
    top_individuals: Array<{
      rank: number;
      email: string;
      display_name: string;
      points: number;
    }>;
  };
}

export default function AdminEngagementOverviewPage() {
  const [days, setDays] = useState("7");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<EngagementOverviewPayload | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const dayNum = Math.max(1, Number(days || "7"));
      const json = await apiFetch<EngagementOverviewPayload>(
        `/api/admin/engagement/overview?days=${encodeURIComponent(String(dayNum))}`
      );
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load engagement overview");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  const d = payload?.data;

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Engagement Overview" subtitle="Live weekly engagement status and participation KPIs" />

      <form className="card" onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <div className="grid grid-2">
          <label>
            Window (days)
            <input value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <button disabled={busy}>{busy ? "Loading..." : "Refresh"}</button>
          </div>
        </div>
      </form>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="grid grid-2">
        <article className="card">
          <div className="kicker">Active Season</div>
          <h2 style={{ margin: "8px 0" }}>{d?.active_season?.title || "No active season"}</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>{d?.active_season?.season_id || "-"}</p>
        </article>
        <article className="card">
          <div className="kicker">Window</div>
          <h2 style={{ margin: "8px 0" }}>{d?.window_days || Number(days || "7")} days</h2>
        </article>
      </section>

      <section className="grid grid-2">
        <article className="card"><div className="kicker">Active Students</div><h2 style={{ margin: "8px 0" }}>{d?.totals.active_students ?? 0}</h2></article>
        <article className="card"><div className="kicker">Claims</div><h2 style={{ margin: "8px 0" }}>{d?.totals.claims_submitted ?? 0}</h2></article>
        <article className="card"><div className="kicker">Journals</div><h2 style={{ margin: "8px 0" }}>{d?.totals.journals_submitted ?? 0}</h2></article>
        <article className="card"><div className="kicker">Event Participation</div><h2 style={{ margin: "8px 0" }}>{d?.totals.events_participated ?? 0}</h2></article>
        <article className="card"><div className="kicker">Quest Completions</div><h2 style={{ margin: "8px 0" }}>{d?.totals.quests_completed ?? 0}</h2></article>
        <article className="card"><div className="kicker">Kudos Sent</div><h2 style={{ margin: "8px 0" }}>{d?.totals.kudos_sent ?? 0}</h2></article>
      </section>

      <section className="grid grid-2">
        <article className="card" style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Active Events</h2>
          {(d?.active_events || []).length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Scope</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(d?.active_events || []).map((event) => (
                    <tr key={event.event_id}>
                      <td>{event.title}</td>
                      <td>Track {event.track || "Any"} | Module {event.module || "Any"}</td>
                      <td>{event.already_submitted ? "Submitted" : "Open"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: 0 }}>No active events.</p>
          )}
        </article>

        <article className="card" style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Top Individuals</h2>
          {(d?.top_individuals || []).length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {(d?.top_individuals || []).map((row, idx) => (
                    <tr key={`${row.email}-${idx}`}>
                      <td>#{row.rank}</td>
                      <td>
                        <div>{row.display_name || row.email}</div>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.email}</div>
                      </td>
                      <td>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: 0 }}>No points yet.</p>
          )}
        </article>
      </section>
    </div>
  );
}
