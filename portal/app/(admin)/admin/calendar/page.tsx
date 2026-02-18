"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface CalendarEvent {
  event_id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at?: string;
  location?: string;
  meeting_url?: string;
  notes?: string;
  enabled: boolean;
}

interface CalendarPayload {
  ok: boolean;
  data: CalendarEvent[];
}

const KINDS = ["session", "deadline", "event", "office_hours"];
const EMPTY_FORM = { title: "", kind: "session", starts_at: "", ends_at: "", location: "", meeting_url: "", notes: "", enabled: true };

export default function AdminCalendarPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<CalendarPayload>("/api/admin/calendar");
      const sorted = (res.data ?? []).sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
      setEvents(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setStatusMsg("");
    setError(null);
    try {
      if (editId) {
        await apiFetch(`/api/admin/calendar/${editId}`, { method: "PATCH", json: form });
      } else {
        await apiFetch("/api/admin/calendar", { method: "POST", json: form });
      }
      setForm(EMPTY_FORM);
      setEditId(null);
      setStatusMsg(editId ? "Event updated." : "Event created.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this calendar event?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/admin/calendar/${id}`, { method: "DELETE" });
      setEvents((prev) => prev.filter((e) => e.event_id !== id));
      if (editId === id) { setForm(EMPTY_FORM); setEditId(null); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  function startEdit(ev: CalendarEvent) {
    setEditId(ev.event_id);
    setForm({
      title: ev.title, kind: ev.kind, starts_at: ev.starts_at, ends_at: ev.ends_at ?? "",
      location: ev.location ?? "", meeting_url: ev.meeting_url ?? "", notes: ev.notes ?? "", enabled: ev.enabled
    });
    setStatusMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => { void load(); }, []);

  const f = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="grid gap-14">
      <PageTitle title="Calendar Manager" subtitle="Create, edit, and remove class calendar entries" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}
      {statusMsg ? <section className="card"><div className="banner">{statusMsg}</div></section> : null}

      <section className="card stack-10">
        <h2 className="title-16">{editId ? "Edit Event" : "New Event"}</h2>
        <div className="grid grid-2">
          <label>
            Title
            <input value={form.title} onChange={f("title")} placeholder="Live Session — Week 3" />
          </label>
          <label>
            Type
            <select value={form.kind} onChange={f("kind")}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </label>
          <label>
            Starts at
            <input type="datetime-local" value={form.starts_at} onChange={f("starts_at")} />
          </label>
          <label>
            Ends at <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
            <input type="datetime-local" value={form.ends_at} onChange={f("ends_at")} />
          </label>
          <label>
            Location <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
            <input value={form.location} onChange={f("location")} placeholder="Zoom / Room 201" />
          </label>
          <label>
            Meeting URL <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
            <input value={form.meeting_url} onChange={f("meeting_url")} placeholder="https://zoom.us/j/..." />
          </label>
        </div>
        <label>
          Notes <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
          <textarea rows={2} value={form.notes} onChange={f("notes")} className="input-resize" />
        </label>
        <div className="row-8">
          <button onClick={() => void save()} disabled={saving || !form.title || !form.starts_at}>
            {saving ? "Saving..." : editId ? "Update Event" : "Create Event"}
          </button>
          {editId ? (
            <button className="secondary" onClick={() => { setForm(EMPTY_FORM); setEditId(null); }}>Cancel</button>
          ) : null}
        </div>
      </section>

      <section className="card row-8">
        <button className="secondary" onClick={() => void load()} disabled={busy}>{busy ? "Loading..." : "Refresh"}</button>
        <span style={{ fontSize: 13, opacity: 0.5, alignSelf: "center" }}>{events.length} events</span>
      </section>

      <section className="card p-0">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Type</th><th>Starts</th><th>Ends</th><th>Location</th><th></th></tr>
            </thead>
            <tbody>
              {events.length === 0 && !busy ? (
                <tr><td colSpan={6} style={{ textAlign: "center", opacity: 0.5 }}>No events yet.</td></tr>
              ) : null}
              {events.map((ev) => (
                <tr key={ev.event_id} style={{ opacity: ev.enabled ? 1 : 0.45 }}>
                  <td>{ev.title}</td>
                  <td>{ev.kind}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(ev.starts_at).toLocaleString()}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{ev.ends_at ? new Date(ev.ends_at).toLocaleString() : "—"}</td>
                  <td>{ev.location ?? "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="secondary" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => startEdit(ev)}>Edit</button>
                    {" "}
                    <button
                      style={{ padding: "2px 8px", fontSize: 12, background: "#ef4444", color: "#fff", border: "none" }}
                      onClick={() => void remove(ev.event_id)}
                      disabled={deletingId === ev.event_id}
                    >
                      {deletingId === ev.event_id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
