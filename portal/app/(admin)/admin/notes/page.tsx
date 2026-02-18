"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Note {
  note_id: string;
  student_email: string;
  author_email: string;
  body: string;
  created_at: string;
}

export default function AdminNotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [filterEmail, setFilterEmail] = useState("");

  const [studentEmail, setStudentEmail] = useState("");
  const [body, setBody] = useState("");

  async function load(email?: string) {
    setBusy(true);
    setError(null);
    try {
      const params = email ? `?student_email=${encodeURIComponent(email)}` : "";
      const json = await apiFetch<{ ok: boolean; data: Note[] }>(`/api/admin/notes${params}`);
      setNotes(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onAddNote(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/admin/notes", {
        method: "POST",
        json: { student_email: studentEmail.trim().toLowerCase(), body: body.trim() }
      });
      setMessage("Note saved.");
      setStudentEmail("");
      setBody("");
      await load(filterEmail || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(noteId: string) {
    if (!confirm("Delete this note permanently?")) return;
    setError(null);
    try {
      await apiFetch(`/api/admin/notes/${noteId}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((n) => n.note_id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete note");
    }
  }

  function onFilter(e: FormEvent) {
    e.preventDefault();
    void load(filterEmail.trim().toLowerCase() || undefined);
  }

  function formatDate(ts: string) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Private Student Notes"
        subtitle="Freeform timestamped notes on any student — never visible to students"
      />

      {/* Add note */}
      <form className="card" onSubmit={(e) => void onAddNote(e)} style={{ display: "grid", gap: 10, maxWidth: 600 }}>
        <div style={{ fontWeight: 700 }}>Add note</div>
        <label>
          Student email
          <input
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            placeholder="student@example.com"
            required
          />
        </label>
        <label>
          Note
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="1:1 meeting notes, intervention context, follow-up flags..."
            required
            style={{ resize: "vertical" }}
          />
        </label>
        <button disabled={saving}>{saving ? "Saving..." : "Add note"}</button>
      </form>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {message ? <div className="banner banner-success">{message}</div> : null}

      {/* Filter */}
      <form className="card" onSubmit={onFilter} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ flex: 1, minWidth: 240 }}>
          Filter by student email (leave blank for all)
          <input
            type="email"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            placeholder="student@example.com"
          />
        </label>
        <button type="submit" disabled={busy}>{busy ? "Loading..." : "Filter"}</button>
        <button
          type="button"
          onClick={() => { setFilterEmail(""); void load(); }}
          style={{ opacity: 0.7 }}
        >
          Show all
        </button>
      </form>

      {/* Notes list */}
      <section className="card" style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>
          {notes.length} note{notes.length !== 1 ? "s" : ""}
          {filterEmail ? ` for ${filterEmail}` : ""}
        </div>
        {notes.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>No notes yet.</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.note_id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "12px 14px",
                display: "grid",
                gap: 6
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{note.student_email}</span>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    by {note.author_email}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>{formatDate(note.created_at)}</span>
                  <button
                    onClick={() => void onDelete(note.note_id)}
                    style={{ fontSize: 12, padding: "2px 8px", background: "var(--danger)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {note.body}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
