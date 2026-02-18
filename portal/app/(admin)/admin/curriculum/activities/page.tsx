"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface LessonRow {
  lesson_key: string;
  lesson_title: string;
  module_id: string;
  lesson_id: number;
}

interface ActivityRow {
  activity_id: string;
  lesson_key: string;
  track: string;
  module_id: string;
  lesson_id: number;
  activity_title: string;
  sim_url: string;
  claim_code_pattern: string;
  status: string;
  sort_order: number;
  updated_at?: string;
}

export default function CurriculumActivitiesPage() {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [lessonKey, setLessonKey] = useState("");
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [newTrack, setNewTrack] = useState("101");
  const [newModuleId, setNewModuleId] = useState("1");
  const [newLessonId, setNewLessonId] = useState("1");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("SIMULATION");
  const [newUrl, setNewUrl] = useState("");
  const [newPattern, setNewPattern] = useState("");
  const [newRoleFocus, setNewRoleFocus] = useState("Front Office");
  const [newDifficulty, setNewDifficulty] = useState("Core");

  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editPattern, setEditPattern] = useState("");
  const [editStatus, setEditStatus] = useState("DRAFT");

  async function loadLessons() {
    const json = await apiFetch<Envelope<LessonRow[]>>("/api/admin/curriculum/draft/lessons");
    const items = json.data || [];
    setLessons(items);
    if (!lessonKey && items.length) setLessonKey(items[0].lesson_key);
  }

  async function loadActivities(lk: string) {
    setBusy(true);
    setMessage("");
    try {
      const url = lk
        ? `/api/admin/curriculum/draft/activities?lessonKey=${encodeURIComponent(lk)}`
        : "/api/admin/curriculum/draft/activities";
      const json = await apiFetch<Envelope<ActivityRow[]>>(url);
      setRows(json.data || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadLessons();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Failed to load lessons");
      }
    })();
  }, []);

  useEffect(() => {
    void loadActivities(lessonKey);
  }, [lessonKey]);

  async function createActivity(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!lessonKey) {
      setMessage("Select a lesson first.");
      return;
    }

    if (!newUrl || !newPattern) {
      setMessage("sim_url and claim_code_pattern are required to publish safely.");
      return;
    }

    try {
      await apiFetch("/api/admin/curriculum/draft/activities", {
        method: "POST",
        json: {
          lesson_key: lessonKey,
          track: newTrack,
          module_id: newModuleId,
          lesson_id: Number(newLessonId),
          activity_title: newTitle,
          activity_type: newType,
          sim_url: newUrl,
          claim_code_pattern: newPattern,
          estimated_minutes: 20,
          role_focus: newRoleFocus,
          difficulty: newDifficulty,
          status: "DRAFT"
        }
      });
      setNewTitle("");
      setNewUrl("");
      setNewPattern("");
      setMessage("Activity created.");
      await loadActivities(lessonKey);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function updateActivity(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!editId) {
      setMessage("Select an activity row first.");
      return;
    }

    try {
      await apiFetch(`/api/admin/curriculum/draft/activities/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        json: {
          activity_title: editTitle,
          sim_url: editUrl,
          claim_code_pattern: editPattern,
          status: editStatus
        }
      });
      setMessage("Activity updated.");
      await loadActivities(lessonKey);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Curriculum Activities" subtitle="Attach simulation URLs and claim-code patterns to each lesson" />

      <section className="card stack-10">
        <div className="grid grid-2">
          <label>
            Lesson Filter
            <select value={lessonKey} onChange={(e) => setLessonKey(e.target.value)}>
              {lessons.map((l) => (
                <option key={l.lesson_key} value={l.lesson_key}>
                  {l.lesson_title || l.lesson_key} ({l.lesson_key})
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={() => void loadActivities(lessonKey)} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh Activities"}
            </button>
          </div>
        </div>
      </section>

      <form className="card" onSubmit={createActivity} style={{ display: "grid", gap: 10 }}>
        <h2 className="title-18">Create Activity</h2>
        <div className="grid grid-2">
          <label>
            Track
            <select value={newTrack} onChange={(e) => setNewTrack(e.target.value)}>
              <option value="101">101</option>
              <option value="201">201</option>
              <option value="301">301</option>
            </select>
          </label>
          <label>
            Module ID
            <input value={newModuleId} onChange={(e) => setNewModuleId(e.target.value)} required />
          </label>
        </div>
        <div className="grid grid-2">
          <label>
            Lesson ID
            <input value={newLessonId} onChange={(e) => setNewLessonId(e.target.value)} required />
          </label>
          <label>
            Activity Title
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
          </label>
        </div>
        <label>
          Simulation URL (GitHub Pages)
          <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} required />
        </label>
        <label>
          Claim Code Pattern
          <input value={newPattern} onChange={(e) => setNewPattern(e.target.value)} required />
        </label>
        <div className="grid grid-2">
          <label>
            Activity Type
            <input value={newType} onChange={(e) => setNewType(e.target.value)} />
          </label>
          <label>
            Role Focus
            <input value={newRoleFocus} onChange={(e) => setNewRoleFocus(e.target.value)} />
          </label>
        </div>
        <label>
          Difficulty
          <input value={newDifficulty} onChange={(e) => setNewDifficulty(e.target.value)} />
        </label>
        <button>Create Activity</button>
      </form>

      <form className="card" onSubmit={updateActivity} style={{ display: "grid", gap: 10 }}>
        <h2 className="title-18">Edit Activity</h2>
        <label>
          Activity ID
          <input value={editId} onChange={(e) => setEditId(e.target.value)} placeholder="Click a row below" />
        </label>
        <label>
          Activity Title
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        </label>
        <label>
          Simulation URL
          <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
        </label>
        <label>
          Claim Code Pattern
          <input value={editPattern} onChange={(e) => setEditPattern(e.target.value)} />
        </label>
        <label>
          Status
          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
        <button className="secondary">Save Activity Changes</button>
      </form>

      {message ? (
        <section className="card">
          <div className="banner">{message}</div>
        </section>
      ) : null}

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Activity ID</th>
              <th>Track</th>
              <th>Module</th>
              <th>Lesson</th>
              <th>Title</th>
              <th>URL</th>
              <th>Pattern</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.activity_id}
                onClick={() => {
                  setEditId(r.activity_id);
                  setEditTitle(r.activity_title || "");
                  setEditUrl(r.sim_url || "");
                  setEditPattern(r.claim_code_pattern || "");
                  setEditStatus(r.status || "DRAFT");
                }}
                style={{ cursor: "pointer" }}
              >
                <td>{r.activity_id}</td>
                <td>{r.track}</td>
                <td>{r.module_id}</td>
                <td>{r.lesson_id}</td>
                <td>{r.activity_title}</td>
                <td>
                  {r.sim_url ? (
                    <a href={r.sim_url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  ) : (
                    ""
                  )}
                </td>
                <td>{r.claim_code_pattern}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
