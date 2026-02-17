"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";
import { apiFetch } from "@/lib/client-api";

export default function AdminCalendarPage() {
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    try {
      await apiFetch("/api/admin/calendar", {
        method: "POST",
        json: {
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          location,
          meeting_url: meetingUrl,
          notes,
          enabled: true
        }
      });
      setMsg("Calendar event saved.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Calendar Manager" subtitle="Create or edit class events" />
      <form className="card" onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <div className="grid grid-2">
          <label>
            Starts At (ISO)
            <input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </label>
          <label>
            Ends At (ISO)
            <input value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
          </label>
        </div>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label>
          Meeting URL
          <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>
        <button>Save event</button>
        {msg ? <p style={{ margin: 0 }}>{msg}</p> : null}
      </form>
      <FetchPanel endpoint="/api/admin/calendar" title="Calendar events" />
    </div>
  );
}
