"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface SeasonRow {
  season_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  participant_count: number;
  event_count: number;
}

interface SeasonsPayload {
  ok: boolean;
  data: SeasonRow[];
}

export default function AdminSeasonsPage() {
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<SeasonRow[]>([]);

  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<SeasonsPayload>("/api/admin/seasons");
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seasons");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch("/api/admin/seasons", {
        method: "POST",
        json: {
          title: title.trim(),
          starts_at: startsAt || undefined,
          ends_at: endsAt || undefined,
          status
        }
      });
      setMessage("Season saved.");
      setTitle("");
      setStartsAt("");
      setEndsAt("");
      setStatus("ACTIVE");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save season");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Season Manager" subtitle="Create and manage one active season at a time" />

      <form className="card stack-10" onSubmit={onCreate}>
        <div className="grid grid-2">
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spring 2026" required />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </label>
        </div>

        <div className="grid grid-2">
          <label>
            Starts At (ISO optional)
            <input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} placeholder="2026-03-02T00:00:00-05:00" />
          </label>
          <label>
            Ends At (ISO optional)
            <input value={endsAt} onChange={(e) => setEndsAt(e.target.value)} placeholder="2026-03-16T23:59:00-05:00" />
          </label>
        </div>

        <button disabled={saving}>{saving ? "Saving..." : "Save season"}</button>
      </form>

      <section className="card row-8-wrap">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh seasons"}
        </button>
        {error ? <span style={{ color: "var(--danger)" }}>{error}</span> : null}
        {message ? <span className="pill">{message}</span> : null}
      </section>

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Season</th>
              <th>Status</th>
              <th>Starts</th>
              <th>Ends</th>
              <th>Participants</th>
              <th>Events</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.season_id}>
                <td>
                  <div className="fw-700">{row.title}</div>
                  <div className="muted-12">{row.season_id}</div>
                </td>
                <td>{row.status}</td>
                <td>{row.starts_at ? new Date(row.starts_at).toLocaleString() : "-"}</td>
                <td>{row.ends_at ? new Date(row.ends_at).toLocaleString() : "-"}</td>
                <td>{row.participant_count || 0}</td>
                <td>{row.event_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
