"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Announcement {
  announcement_id: string;
  title: string;
  body: string;
  kind: string;
  publish_at: string;
  expires_at: string;
  status: string;
}

interface AnnouncementsPayload {
  ok: boolean;
  data: { announcements: Announcement[] };
}

const KIND_OPTIONS = ["info", "warning", "success"];

const EMPTY_FORM = {
  announcement_id: "",
  title: "",
  body: "",
  kind: "info",
  publish_at: "",
  expires_at: "",
};

function fmtDt(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function localDatetimeValue(iso: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}

const STATUS_STYLE: Record<string, { color: string; border: string }> = {
  scheduled: { color: "#c45c00", border: "#c45c0055" },
  active:    { color: "#0d7a4f", border: "#0d7a4f55" },
  expired:   { color: "var(--muted)", border: "var(--border)" },
};

export default function AdminAnnouncementsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<AnnouncementsPayload>("/api/admin/announcements");
      setAnnouncements(json.data.announcements ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load announcements");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload = {
        ...form,
        publish_at: form.publish_at ? new Date(form.publish_at).toISOString() : new Date().toISOString(),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : "",
      };
      await apiFetch("/api/admin/announcements", { method: "POST", body: JSON.stringify(payload) });
      setSaveMsg("Saved!");
      setForm(EMPTY_FORM);
      void load();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Delete this announcement?")) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function editAnnouncement(a: Announcement) {
    setForm({
      announcement_id: a.announcement_id,
      title: a.title,
      body: a.body,
      kind: a.kind,
      publish_at: localDatetimeValue(a.publish_at),
      expires_at: localDatetimeValue(a.expires_at),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="grid gap-20">
      <PageTitle
        title="Portal Announcements"
        subtitle="Schedule banner messages that appear to all students at the top of every page."
      />

      {error && <div className="banner banner-error"><strong>Error:</strong> {error}</div>}

      {/* Create / Edit Form */}
      <section className="card stack-12">
        <h2 className="title-18">{form.announcement_id ? "Edit Announcement" : "New Announcement"}</h2>
        <div className="grid grid-2" style={{ gap: 10 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 13, gridColumn: "span 2" }}>
            Title (optional short headline)
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Office Hours Moved to Thursday" />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13, gridColumn: "span 2" }}>
            Message Body
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={3}
              placeholder="Write the full announcement text here…"
              style={{ resize: "vertical" }}
            />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Type / Style
            <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
              {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <div />
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Publish At (local time)
            <input type="datetime-local" value={form.publish_at} onChange={(e) => setForm((f) => ({ ...f, publish_at: e.target.value }))} />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Expires At (optional)
            <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
          </label>
        </div>

        {/* Preview */}
        {(form.title || form.body) && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div className="kicker" style={{ marginBottom: 8 }}>Preview</div>
            <div style={{
              background: form.kind === "warning" ? "#fffbeb" : form.kind === "success" ? "#f0fdf4" : "#eff6ff",
              border: `1.5px solid ${form.kind === "warning" ? "#f59e0b" : form.kind === "success" ? "#22c55e" : "#3b82f6"}`,
              borderRadius: 10,
              padding: "11px 16px",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 18 }}>{form.kind === "warning" ? "⚠️" : form.kind === "success" ? "✅" : "ℹ️"}</span>
              <div>
                {form.title && <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{form.title}</div>}
                {form.body && <div style={{ fontSize: 14, lineHeight: 1.5 }}>{form.body}</div>}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => void save()} disabled={saving || !form.body.trim()}>
            {saving ? "Saving…" : form.announcement_id ? "Update Announcement" : "Schedule Announcement"}
          </button>
          {form.announcement_id && (
            <button className="secondary" onClick={() => setForm(EMPTY_FORM)}>Cancel Edit</button>
          )}
          {saveMsg && <span style={{ fontSize: 13, color: saveMsg === "Saved!" ? "#0d7a4f" : "var(--danger)" }}>{saveMsg}</span>}
        </div>
      </section>

      {/* Announcements List */}
      <section className="card stack-12">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 className="title-18">All Announcements</h2>
          <button onClick={() => void load()} disabled={busy} className="secondary" style={{ marginLeft: "auto", fontSize: 13, padding: "4px 10px" }}>
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>

        {announcements.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>No announcements yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {announcements.map((a) => {
              const ss = STATUS_STYLE[a.status] ?? STATUS_STYLE.expired;
              return (
                <div
                  key={a.announcement_id}
                  style={{
                    background: "var(--surface-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {a.title && <div style={{ fontWeight: 700, fontSize: 14 }}>{a.title}</div>}
                      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: a.title ? 2 : 0, whiteSpace: "pre-wrap" }}>{a.body}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                      <span className="pill" style={{ color: ss.color, borderColor: ss.border, fontSize: 11 }}>{a.status}</span>
                      <span className="pill" style={{ fontSize: 11 }}>{a.kind}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      Publishes: {fmtDt(a.publish_at)}
                      {a.expires_at ? ` · Expires: ${fmtDt(a.expires_at)}` : ""}
                    </span>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button onClick={() => editAnnouncement(a)} className="secondary" style={{ fontSize: 12, padding: "3px 8px" }}>Edit</button>
                      <button
                        onClick={() => void deleteAnnouncement(a.announcement_id)}
                        disabled={deleting === a.announcement_id}
                        className="danger"
                        style={{ fontSize: 12, padding: "3px 8px" }}
                      >
                        {deleting === a.announcement_id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
