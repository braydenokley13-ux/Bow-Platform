"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Announcement {
  announcement_id: string;
  title: string;
  body: string;
  show_at: string;
  auto_hide_at: string;
  status: string;
  created_by: string;
  created_at: string;
}

export default function AdminAnnouncementsPage() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showAt, setShowAt] = useState("");
  const [autoHideAt, setAutoHideAt] = useState("");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<{ ok: boolean; data: Announcement[] }>("/api/admin/announcements");
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load announcements");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/admin/announcements", {
        method: "POST",
        json: {
          title: title.trim(),
          body: body.trim(),
          show_at: showAt || undefined,
          auto_hide_at: autoHideAt || undefined
        }
      });
      setMessage("Announcement scheduled.");
      setTitle("");
      setBody("");
      setShowAt("");
      setAutoHideAt("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create announcement");
    } finally {
      setSaving(false);
    }
  }

  async function onDismiss(id: string) {
    setDismissing(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/announcements/${id}/dismiss`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss announcement");
    } finally {
      setDismissing(null);
    }
  }

  function formatDate(ts: string) {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  }

  function statusColor(status: string) {
    if (status === "ACTIVE") return "var(--success, #22c55e)";
    if (status === "DISMISSED") return "var(--muted)";
    return "var(--muted)";
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Portal Announcements"
        subtitle="Schedule banner messages that appear to all students at a specified time"
      />

      <form className="card" onSubmit={(e) => void onSave(e)} style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Create announcement</div>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Heads up: session starts tomorrow at 7PM"
            required
          />
        </label>
        <label>
          Body
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Full message text shown to students..."
            required
            style={{ resize: "vertical" }}
          />
        </label>
        <div className="grid grid-2">
          <label>
            Show at (leave blank to show immediately)
            <input
              type="datetime-local"
              value={showAt}
              onChange={(e) => setShowAt(e.target.value)}
            />
          </label>
          <label>
            Auto-hide at (leave blank for manual dismiss only)
            <input
              type="datetime-local"
              value={autoHideAt}
              onChange={(e) => setAutoHideAt(e.target.value)}
            />
          </label>
        </div>
        <button disabled={saving}>{saving ? "Saving..." : "Schedule announcement"}</button>
      </form>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {message ? <div className="banner banner-success">{message}</div> : null}

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh"}
        </button>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {rows.filter((r) => r.status === "ACTIVE").length} active ·{" "}
          {rows.filter((r) => r.status === "DISMISSED").length} dismissed
        </span>
      </section>

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title / Body</th>
              <th>Show At</th>
              <th>Auto-Hide At</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.announcement_id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2, maxWidth: 300 }}>{row.body}</div>
                </td>
                <td style={{ fontSize: 12 }}>{formatDate(row.show_at)}</td>
                <td style={{ fontSize: 12 }}>{formatDate(row.auto_hide_at)}</td>
                <td>
                  <span style={{ color: statusColor(row.status), fontWeight: 700, fontSize: 12 }}>
                    {row.status}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>{row.created_by}</td>
                <td>
                  {row.status === "ACTIVE" ? (
                    <button
                      onClick={() => void onDismiss(row.announcement_id)}
                      disabled={dismissing === row.announcement_id}
                      style={{ fontSize: 12, padding: "3px 10px" }}
                    >
                      {dismissing === row.announcement_id ? "..." : "Dismiss"}
                    </button>
                  ) : (
                    <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)", textAlign: "center" }}>
                  No announcements yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
