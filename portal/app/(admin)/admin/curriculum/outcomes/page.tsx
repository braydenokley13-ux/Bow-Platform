"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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
}

interface OutcomeRow {
  outcome_id: string;
  lesson_key: string;
  module_id: string;
  skill_name: string;
  framework_name: string;
  mastery_definition: string;
  assessment_hint: string;
  status: string;
  sort_order: number;
  updated_at?: string;
}

export default function CurriculumOutcomesPage() {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [lessonKey, setLessonKey] = useState("");
  const [rows, setRows] = useState<OutcomeRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [newSkill, setNewSkill] = useState("Strategic Decision-Making");
  const [newFramework, setNewFramework] = useState("Decision-Evidence-Risk");
  const [newMastery, setNewMastery] = useState("");
  const [newHint, setNewHint] = useState("");

  const [editId, setEditId] = useState("");
  const [editSkill, setEditSkill] = useState("");
  const [editFramework, setEditFramework] = useState("");
  const [editStatus, setEditStatus] = useState("DRAFT");

  const loadLessons = useCallback(async () => {
    const json = await apiFetch<Envelope<LessonRow[]>>("/api/admin/curriculum/draft/lessons");
    const items = json.data || [];
    setLessons(items);
    if (items.length) {
      setLessonKey((prev) => prev || items[0].lesson_key);
    }
  }, []);

  const loadOutcomes = useCallback(async (lk: string) => {
    setBusy(true);
    setMessage("");
    try {
      const url = lk
        ? `/api/admin/curriculum/draft/outcomes?lessonKey=${encodeURIComponent(lk)}`
        : "/api/admin/curriculum/draft/outcomes";
      const json = await apiFetch<Envelope<OutcomeRow[]>>(url);
      setRows(json.data || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load outcomes");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await loadLessons();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Failed to load lessons");
      }
    })();
  }, [loadLessons]);

  useEffect(() => {
    void loadOutcomes(lessonKey);
  }, [lessonKey, loadOutcomes]);

  async function createOutcome(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const lesson = lessons.find((l) => l.lesson_key === lessonKey);
    if (!lesson) {
      setMessage("Select a valid lesson first.");
      return;
    }

    try {
      await apiFetch("/api/admin/curriculum/draft/outcomes", {
        method: "POST",
        json: {
          lesson_key: lessonKey,
          module_id: lesson.module_id,
          skill_name: newSkill,
          framework_name: newFramework,
          mastery_definition: newMastery,
          assessment_hint: newHint,
          status: "DRAFT"
        }
      });
      setNewMastery("");
      setNewHint("");
      setMessage("Outcome created.");
      await loadOutcomes(lessonKey);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function updateOutcome(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!editId) {
      setMessage("Select an outcome row first.");
      return;
    }

    try {
      await apiFetch(`/api/admin/curriculum/draft/outcomes/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        json: {
          skill_name: editSkill,
          framework_name: editFramework,
          status: editStatus
        }
      });
      setMessage("Outcome updated.");
      await loadOutcomes(lessonKey);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Curriculum Outcomes" subtitle="Define measurable lesson outcomes and frameworks" />

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
            <button onClick={() => void loadOutcomes(lessonKey)} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh Outcomes"}
            </button>
          </div>
        </div>
      </section>

      <form className="card stack-10" onSubmit={createOutcome}>
        <h2 className="title-18">Create Outcome</h2>
        <div className="grid grid-2">
          <label>
            Skill Name
            <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} required />
          </label>
          <label>
            Framework Name
            <input value={newFramework} onChange={(e) => setNewFramework(e.target.value)} required />
          </label>
        </div>
        <label>
          Mastery Definition
          <textarea value={newMastery} onChange={(e) => setNewMastery(e.target.value)} rows={2} required />
        </label>
        <label>
          Assessment Hint
          <textarea value={newHint} onChange={(e) => setNewHint(e.target.value)} rows={2} />
        </label>
        <button>Create Outcome</button>
      </form>

      <form className="card stack-10" onSubmit={updateOutcome}>
        <h2 className="title-18">Edit Outcome</h2>
        <label>
          Outcome ID
          <input value={editId} onChange={(e) => setEditId(e.target.value)} placeholder="Click a row below" />
        </label>
        <div className="grid grid-2">
          <label>
            Skill Name
            <input value={editSkill} onChange={(e) => setEditSkill(e.target.value)} />
          </label>
          <label>
            Framework Name
            <input value={editFramework} onChange={(e) => setEditFramework(e.target.value)} />
          </label>
        </div>
        <label>
          Status
          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
        <button className="secondary">Save Outcome Changes</button>
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
              <th>Outcome ID</th>
              <th>Lesson Key</th>
              <th>Skill</th>
              <th>Framework</th>
              <th>Status</th>
              <th>Sort</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.outcome_id}
                onClick={() => {
                  setEditId(r.outcome_id);
                  setEditSkill(r.skill_name || "");
                  setEditFramework(r.framework_name || "");
                  setEditStatus(r.status || "DRAFT");
                }}
                className="cursor-pointer"
              >
                <td>{r.outcome_id}</td>
                <td>{r.lesson_key}</td>
                <td>{r.skill_name}</td>
                <td>{r.framework_name}</td>
                <td>{r.status}</td>
                <td>{r.sort_order}</td>
                <td>{r.updated_at ? new Date(r.updated_at).toLocaleString() : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
