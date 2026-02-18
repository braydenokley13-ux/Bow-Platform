"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Note {
  note_id: string;
  student_email: string;
  content: string;
  author_email: string;
  created_at: string;
}

interface NotesPayload {
  ok: boolean;
  data: { notes: Note[] };
}

interface Student {
  email: string;
  display_name: string;
}

interface StudentsPayload {
  ok: boolean;
  data: { students: Student[] };
}

export default function AdminNotesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [loadingNotes, setBusyNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  async function loadStudents() {
    try {
      const json = await apiFetch<StudentsPayload>("/api/admin/students");
      setStudents(json.data?.students ?? []);
    } catch {
      // fail silently
    }
  }

  async function loadNotes(email: string) {
    if (!email) return;
    setBusyNotes(true);
    setNotesError(null);
    setNotes(null);
    try {
      const json = await apiFetch<NotesPayload>(`/api/admin/notes?email=${encodeURIComponent(email)}`);
      setNotes(json.data.notes ?? []);
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setBusyNotes(false);
    }
  }

  async function saveNote() {
    if (!selectedEmail || !newContent.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiFetch("/api/admin/notes", {
        method: "POST",
        body: JSON.stringify({ student_email: selectedEmail, content: newContent.trim() }),
      });
      setNewContent("");
      setSaveMsg("Note saved.");
      void loadNotes(selectedEmail);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm("Delete this note permanently?")) return;
    setDeleting(noteId);
    try {
      await apiFetch(`/api/admin/notes/${noteId}`, { method: "DELETE" });
      void loadNotes(selectedEmail);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function selectStudent(email: string) {
    setSelectedEmail(email);
    setInputEmail(email);
    setNotes(null);
    setSaveMsg(null);
    void loadNotes(email);
  }

  useEffect(() => { void loadStudents(); }, []);

  const studentName = students.find((s) => s.email === selectedEmail)?.display_name;

  return (
    <div className="grid gap-20">
      <PageTitle
        title="Private Student Notes"
        subtitle="Freeform notes on students — never visible to students. Timestamped and author-attributed."
      />

      <div className="grid-2" style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(220px, 280px) 1fr", alignItems: "start" }}>
        {/* Student Picker */}
        <aside className="card stack-10">
          <div style={{ fontWeight: 700, fontSize: 15 }}>Select Student</div>
          <input
            type="text"
            placeholder="Filter by name or email…"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
            style={{ fontSize: 13 }}
          />
          <div style={{ display: "grid", gap: 4, maxHeight: 360, overflowY: "auto" }}>
            {students
              .filter((s) =>
                !inputEmail ||
                s.display_name.toLowerCase().includes(inputEmail.toLowerCase()) ||
                s.email.toLowerCase().includes(inputEmail.toLowerCase())
              )
              .map((s) => (
                <button
                  key={s.email}
                  onClick={() => selectStudent(s.email)}
                  style={{
                    textAlign: "left",
                    padding: "7px 10px",
                    borderRadius: 8,
                    background: selectedEmail === s.email ? "var(--brand)" : "var(--surface-soft)",
                    color: selectedEmail === s.email ? "#fff" : "var(--text)",
                    border: `1px solid ${selectedEmail === s.email ? "var(--brand)" : "var(--border)"}`,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{s.display_name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{s.email}</div>
                </button>
              ))}
            {students.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Loading students…</p>
            )}
          </div>
        </aside>

        {/* Notes Panel */}
        <div className="card stack-14">
          {!selectedEmail ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>Select a student to view and add notes.</p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 17 }}>
                  Notes for {studentName ?? selectedEmail}
                </h2>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>private · never visible to students</span>
              </div>

              {/* Add Note */}
              <div style={{ display: "grid", gap: 8 }}>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Add a note (intervention context, 1:1 meeting notes, behavioral flags…)"
                  rows={3}
                  style={{ resize: "vertical", fontSize: 14 }}
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => void saveNote()} disabled={saving || !newContent.trim()}>
                    {saving ? "Saving…" : "Add Note"}
                  </button>
                  {saveMsg && (
                    <span style={{ fontSize: 13, color: saveMsg === "Note saved." ? "#0d7a4f" : "var(--danger)" }}>{saveMsg}</span>
                  )}
                </div>
              </div>

              {/* Notes List */}
              {notesError && <div className="banner banner-error">{notesError}</div>}

              {loadingNotes ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton sk-line" style={{ height: 60, borderRadius: 8 }} />
                  ))}
                </div>
              ) : notes === null ? null : notes.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>No notes yet for this student.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {notes.map((note) => (
                    <div
                      key={note.note_id}
                      style={{
                        background: "var(--surface-soft)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{note.content}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          {note.author_email} ·{" "}
                          {new Date(note.created_at).toLocaleString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <button
                          onClick={() => void deleteNote(note.note_id)}
                          disabled={deleting === note.note_id}
                          className="danger"
                          style={{ fontSize: 12, padding: "3px 8px" }}
                        >
                          {deleting === note.note_id ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
