"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
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
  rules_json: string;
  status: string;
  already_submitted: boolean;
}

interface EventListPayload {
  ok: boolean;
  data: EventRow[];
}

interface EventSubmitPayload {
  ok: boolean;
  code: string;
  message: string;
  data: {
    submission_id: string;
    event_id: string;
    score: number;
    awarded_points: number;
  };
}

export default function StudentEventsPage() {
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [reflection, setReflection] = useState("");
  const [result, setResult] = useState<EventSubmitPayload | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<EventListPayload>("/api/events/active");
      const rows = Array.isArray(json.data) ? json.data : [];
      setEvents(rows);
      if (rows.length) {
        setEventId((prev) => prev || rows[0].event_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => events.find((row) => row.event_id === eventId) || null,
    [eventId, events]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!eventId || !claimCode.trim()) return;

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const json = await apiFetch<EventSubmitPayload>(`/api/events/${encodeURIComponent(eventId)}/submit`, {
        method: "POST",
        json: {
          claim_code: claimCode.trim(),
          reflection_note: reflection.trim()
        }
      });
      setResult(json);
      setClaimCode("");
      setReflection("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit event entry");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Live Events" subtitle="Join active events using claim-code proof" />

      <section className="card row-8-center-wrap">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh active events"}
        </button>
        <span className="pill">One submission per event</span>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="card stack-10">
        <h2 className="title-18">Active Event List</h2>
        {events.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Scope</th>
                  <th>Window</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((row) => (
                  <tr key={row.event_id}>
                    <td>
                      <div className="fw-700">{row.title}</div>
                      <div className="muted-12">{row.event_id}</div>
                    </td>
                    <td>
                      Track {row.track || "Any"} | Module {row.module || "Any"}
                    </td>
                    <td>
                      <div>{row.open_at ? new Date(row.open_at).toLocaleString() : "Now"}</div>
                      <div>{row.close_at ? new Date(row.close_at).toLocaleString() : "Open"}</div>
                    </td>
                    <td>{row.already_submitted ? <span className="pill">Submitted</span> : <span className="pill">Open</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0">No active events right now.</p>
        )}
      </section>

      <form className="card stack-10" onSubmit={onSubmit}>
        <h2 className="title-18">Submit Event Entry</h2>
        <div className="grid grid-2">
          <label>
            Event
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} required>
              <option value="">Select event</option>
              {events.map((row) => (
                <option key={row.event_id} value={row.event_id}>
                  {row.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Claim Code
            <input
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              placeholder="Enter claim code"
              required
            />
          </label>
        </div>

        <label>
          Reflection Note (optional)
          <textarea
            rows={3}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What was your strategy in this event?"
          />
        </label>

        {selected ? (
          <div className="pill">
            Selected: Track {selected.track || "Any"} | Module {selected.module || "Any"}
          </div>
        ) : null}

        <button disabled={submitting || !events.length}>
          {submitting ? "Submitting..." : "Submit event entry"}
        </button>
      </form>

      {result ? (
        <section className="card stack-6">
          <div className="banner banner-success">{result.message}</div>
          <div>Submission ID: {result.data?.submission_id}</div>
          <div>Score: {result.data?.score}</div>
          <div>Participation Points: {result.data?.awarded_points}</div>
        </section>
      ) : null}
    </div>
  );
}
