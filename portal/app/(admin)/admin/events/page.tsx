"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface EventRow {
  event_id: string;
  season_id: string;
  title: string;
  description: string;
  track: string;
  module: string;
  open_at: string;
  close_at: string;
  status: string;
  submission_count: number;
  participant_count: number;
  completed_count: number;
}

interface EventsPayload {
  ok: boolean;
  data: EventRow[];
}

export default function AdminEventsPage() {
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<EventRow[]>([]);

  const [seasonIdFilter, setSeasonIdFilter] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [track, setTrack] = useState("201");
  const [moduleId, setModuleId] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const endpoint = seasonIdFilter
        ? `/api/admin/events?season_id=${encodeURIComponent(seasonIdFilter)}`
        : "/api/admin/events";
      const json = await apiFetch<EventsPayload>(endpoint);
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/admin/events", {
        method: "POST",
        json: {
          season_id: seasonId || undefined,
          title: title.trim(),
          description: description.trim(),
          track: track || undefined,
          module: moduleId || undefined,
          open_at: openAt || undefined,
          close_at: closeAt || undefined,
          status
        }
      });
      setMessage("Event saved.");
      setTitle("");
      setDescription("");
      setTrack("201");
      setModuleId("");
      setOpenAt("");
      setCloseAt("");
      setStatus("ACTIVE");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Live Event Manager" subtitle="Create and operate track-based live events" />

      <form className="card" onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
        <div className="grid grid-2">
          <label>
            Season ID (blank = active)
            <input value={seasonId} onChange={(e) => setSeasonId(e.target.value)} placeholder="SEA_..." />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </label>
        </div>

        <div className="grid grid-2">
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Track
            <select value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="">Any</option>
              <option value="101">101</option>
              <option value="201">201</option>
              <option value="301">301</option>
            </select>
          </label>
        </div>

        <div className="grid grid-2">
          <label>
            Module (optional)
            <input value={moduleId} onChange={(e) => setModuleId(e.target.value)} placeholder="1 or GAUNTLET" />
          </label>
          <label>
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-2">
          <label>
            Open At (ISO)
            <input value={openAt} onChange={(e) => setOpenAt(e.target.value)} placeholder="2026-03-10T16:00:00-05:00" />
          </label>
          <label>
            Close At (ISO)
            <input value={closeAt} onChange={(e) => setCloseAt(e.target.value)} placeholder="2026-03-10T18:00:00-05:00" />
          </label>
        </div>

        <button disabled={saving}>{saving ? "Saving..." : "Save event"}</button>
      </form>

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <div className="grid grid-2">
          <label>
            Filter by Season ID
            <input value={seasonIdFilter} onChange={(e) => setSeasonIdFilter(e.target.value)} placeholder="SEA_..." />
          </label>
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <button onClick={() => void load()} disabled={busy}>
              {busy ? "Loading..." : "Refresh events"}
            </button>
          </div>
        </div>
        {error ? <div className="banner banner-error">{error}</div> : null}
        {message ? <div className="banner banner-success">{message}</div> : null}
      </section>

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Scope</th>
              <th>Status</th>
              <th>Window</th>
              <th>Submissions</th>
              <th>Participants</th>
              <th>Scored</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.event_id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.event_id}</div>
                </td>
                <td>
                  Season: {row.season_id || "-"}
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    Track {row.track || "Any"} | Module {row.module || "Any"}
                  </div>
                </td>
                <td>{row.status}</td>
                <td>
                  <div>{row.open_at ? new Date(row.open_at).toLocaleString() : "-"}</div>
                  <div>{row.close_at ? new Date(row.close_at).toLocaleString() : "-"}</div>
                </td>
                <td>{row.submission_count || 0}</td>
                <td>{row.participant_count || 0}</td>
                <td>{row.completed_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
