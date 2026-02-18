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
  expires_at: ""
};

const STATUS_CLASS: Record<string, string> = {
  scheduled: "pill-status-pending",
  active: "pill-status-positive",
  expired: "pill-status-muted"
};

const PREVIEW_CLASS: Record<string, string> = {
  info: "admin-announcement-preview info",
  warning: "admin-announcement-preview warning",
  success: "admin-announcement-preview success"
};

function fmtDt(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function localDatetimeValue(iso: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

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
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : ""
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
      expires_at: localDatetimeValue(a.expires_at)
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-20">
      <PageTitle
        title="Portal Announcements"
        subtitle="Schedule banner messages that appear to all students at the top of every page."
      />

      {error && <div className="banner banner-error"><strong>Error:</strong> {error}</div>}

      <section className="card stack-12">
        <h2 className="title-18">{form.announcement_id ? "Edit Announcement" : "New Announcement"}</h2>
        <div className="grid grid-2 gap-10">
          <label className="field field-sm grid-span-2">
            Title (optional short headline)
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Office Hours Moved to Thursday" />
          </label>

          <label className="field field-sm grid-span-2">
            Message Body
            <textarea
              className="input-resize"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={3}
              placeholder="Write the full announcement text here…"
            />
          </label>

          <label className="field field-sm">
            Type / Style
            <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
              {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>

          <div />

          <label className="field field-sm">
            Publish At (local time)
            <input type="datetime-local" value={form.publish_at} onChange={(e) => setForm((f) => ({ ...f, publish_at: e.target.value }))} />
          </label>

          <label className="field field-sm">
            Expires At (optional)
            <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
          </label>
        </div>

        {(form.title || form.body) && (
          <div className="admin-announcement-preview-wrap">
            <div className="kicker mb-8">Preview</div>
            <div className={PREVIEW_CLASS[form.kind] ?? PREVIEW_CLASS.info}>
              <span className="admin-announcement-preview-icon">{form.kind === "warning" ? "⚠️" : form.kind === "success" ? "✅" : "ℹ️"}</span>
              <div>
                {form.title && <div className="admin-announcement-title">{form.title}</div>}
                {form.body && <div className="admin-announcement-body">{form.body}</div>}
              </div>
            </div>
          </div>
        )}

        <div className="row-8-center-wrap">
          <button onClick={() => void save()} disabled={saving || !form.body.trim()}>
            {saving ? "Saving…" : form.announcement_id ? "Update Announcement" : "Schedule Announcement"}
          </button>
          {form.announcement_id && <button className="secondary" onClick={() => setForm(EMPTY_FORM)}>Cancel Edit</button>}
          {saveMsg && <span className={`fs-13 ${saveMsg === "Saved!" ? "text-success" : "text-danger"}`}>{saveMsg}</span>}
        </div>
      </section>

      <section className="card stack-12">
        <div className="row-10-baseline">
          <h2 className="title-18">All Announcements</h2>
          <button onClick={() => void load()} disabled={busy} className="secondary ml-auto btn-sm">
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>

        {announcements.length === 0 ? (
          <p className="m-0 text-muted">No announcements yet.</p>
        ) : (
          <div className="stack-10">
            {announcements.map((a) => (
              <div key={a.announcement_id} className="admin-announcement-item">
                <div className="admin-announcement-top">
                  <div className="admin-announcement-main">
                    {a.title && <div className="admin-announcement-title">{a.title}</div>}
                    <div className={`admin-announcement-body${a.title ? " mt-2" : ""}`}>{a.body}</div>
                  </div>
                  <div className="admin-announcement-badges">
                    <span className={`pill fs-11 ${STATUS_CLASS[a.status] ?? "pill-status-muted"}`}>{a.status}</span>
                    <span className="pill fs-11">{a.kind}</span>
                  </div>
                </div>

                <div className="admin-announcement-bottom">
                  <span className="muted-12">
                    Publishes: {fmtDt(a.publish_at)}
                    {a.expires_at ? ` · Expires: ${fmtDt(a.expires_at)}` : ""}
                  </span>
                  <div className="row-6 ml-auto">
                    <button onClick={() => editAnnouncement(a)} className="secondary btn-xs">Edit</button>
                    <button
                      onClick={() => void deleteAnnouncement(a.announcement_id)}
                      disabled={deleting === a.announcement_id}
                      className="danger btn-xs"
                    >
                      {deleting === a.announcement_id ? "…" : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
