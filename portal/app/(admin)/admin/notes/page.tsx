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
        body: JSON.stringify({ student_email: selectedEmail, content: newContent.trim() })
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

  useEffect(() => {
    void loadStudents();
  }, []);

  const studentName = students.find((s) => s.email === selectedEmail)?.display_name;

  return (
    <div className="grid gap-20">
      <PageTitle
        title="Private Student Notes"
        subtitle="Freeform notes on students — never visible to students. Timestamped and author-attributed."
      />

      <div className="notes-layout-grid">
        <aside className="card stack-10">
          <div className="notes-picker-title">Select Student</div>
          <input
            type="text"
            placeholder="Filter by name or email…"
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
            className="fs-13"
          />
          <div className="notes-student-list">
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
                  className={`notes-student-button${selectedEmail === s.email ? " is-active" : ""}`}
                >
                  <div className="fw-600">{s.display_name}</div>
                  <div className="notes-student-email">{s.email}</div>
                </button>
              ))}
            {students.length === 0 && <p className="m-0 muted-13">Loading students…</p>}
          </div>
        </aside>

        <div className="card stack-14">
          {!selectedEmail ? (
            <p className="m-0 text-muted">Select a student to view and add notes.</p>
          ) : (
            <>
              <div className="row-8-baseline">
                <h2 className="notes-panel-title">Notes for {studentName ?? selectedEmail}</h2>
                <span className="muted-12">private · never visible to students</span>
              </div>

              <div className="stack-8">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Add a note (intervention context, 1:1 meeting notes, behavioral flags…)"
                  rows={3}
                  className="input-resize fs-14"
                />
                <div className="row-8-center">
                  <button onClick={() => void saveNote()} disabled={saving || !newContent.trim()}>
                    {saving ? "Saving…" : "Add Note"}
                  </button>
                  {saveMsg && (
                    <span className={`fs-13 ${saveMsg === "Note saved." ? "text-success" : "text-danger"}`}>{saveMsg}</span>
                  )}
                </div>
              </div>

              {notesError && <div className="banner banner-error">{notesError}</div>}

              {loadingNotes ? (
                <div className="stack-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton notes-skeleton" />
                  ))}
                </div>
              ) : notes === null ? null : notes.length === 0 ? (
                <p className="m-0 muted-14">No notes yet for this student.</p>
              ) : (
                <div className="stack-10">
                  {notes.map((note) => (
                    <div key={note.note_id} className="notes-item">
                      <p className="notes-content">{note.content}</p>
                      <div className="notes-item-footer">
                        <span className="muted-11">
                          {note.author_email} ·{" "}
                          {new Date(note.created_at).toLocaleString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                        <button
                          onClick={() => void deleteNote(note.note_id)}
                          disabled={deleting === note.note_id}
                          className="danger btn-xs"
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
