"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface ModuleRow {
  module_id: string;
  module_title: string;
  program_id: string;
}

interface LessonRow {
  lesson_key: string;
  program_id: string;
  module_id: string;
  lesson_id: number;
  lesson_title: string;
  concept_intro: string;
  case_context: string;
  decision_prompt: string;
  debrief_framework: string;
  sort_order: number;
  status: string;
  updated_at?: string;
}

export default function CurriculumLessonsPage() {
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [moduleId, setModuleId] = useState("");
  const [rows, setRows] = useState<LessonRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newLessonId, setNewLessonId] = useState("1");
  const [newConcept, setNewConcept] = useState("");
  const [newCase, setNewCase] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  const [editKey, setEditKey] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("DRAFT");

  const loadModules = useCallback(async () => {
    const json = await apiFetch<Envelope<ModuleRow[]>>("/api/admin/curriculum/draft/modules");
    const items = json.data || [];
    setModules(items);
    if (items.length) {
      setModuleId((prev) => prev || items[0].module_id);
    }
  }, []);

  const loadLessons = useCallback(async (mid: string) => {
    setBusy(true);
    setMessage("");
    try {
      const url = mid
        ? `/api/admin/curriculum/draft/lessons?moduleId=${encodeURIComponent(mid)}`
        : "/api/admin/curriculum/draft/lessons";
      const json = await apiFetch<Envelope<LessonRow[]>>(url);
      setRows(json.data || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load lessons");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await loadModules();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Failed to load modules");
      }
    })();
  }, [loadModules]);

  useEffect(() => {
    void loadLessons(moduleId);
  }, [moduleId, loadLessons]);

  async function createLesson(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const mod = modules.find((m) => m.module_id === moduleId);
    if (!mod) {
      setMessage("Select a valid module first.");
      return;
    }

    try {
      await apiFetch("/api/admin/curriculum/draft/lessons", {
        method: "POST",
        json: {
          program_id: mod.program_id,
          module_id: mod.module_id,
          lesson_id: Number(newLessonId),
          lesson_title: newTitle,
          concept_intro: newConcept,
          case_context: newCase,
          decision_prompt: newPrompt,
          debrief_framework: "Decision -> Evidence -> Risk -> Reflection",
          status: "DRAFT"
        }
      });
      setNewTitle("");
      setNewConcept("");
      setNewCase("");
      setNewPrompt("");
      setMessage("Lesson created.");
      await loadLessons(moduleId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function updateLesson(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!editKey) {
      setMessage("Select a lesson row first.");
      return;
    }

    try {
      await apiFetch(`/api/admin/curriculum/draft/lessons/${encodeURIComponent(editKey)}`, {
        method: "PATCH",
        json: {
          lesson_title: editTitle,
          status: editStatus
        }
      });
      setMessage("Lesson updated.");
      await loadLessons(moduleId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Curriculum Lessons" subtitle="Build lessons inside modules" />

      <section className="card stack-10">
        <div className="grid grid-2">
          <label>
            Module Filter
            <select value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
              {modules.map((m) => (
                <option key={m.module_id} value={m.module_id}>
                  {m.module_title || m.module_id} ({m.module_id})
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={() => void loadLessons(moduleId)} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh Lessons"}
            </button>
          </div>
        </div>
      </section>

      <form className="card stack-10" onSubmit={createLesson}>
        <h2 className="title-18">Create Lesson</h2>
        <div className="grid grid-2">
          <label>
            Lesson ID (number)
            <input value={newLessonId} onChange={(e) => setNewLessonId(e.target.value)} required />
          </label>
          <label>
            Lesson Title
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
          </label>
        </div>
        <label>
          Concept Intro
          <textarea value={newConcept} onChange={(e) => setNewConcept(e.target.value)} rows={2} />
        </label>
        <label>
          Case Context
          <textarea value={newCase} onChange={(e) => setNewCase(e.target.value)} rows={2} />
        </label>
        <label>
          Decision Prompt
          <textarea value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} rows={2} />
        </label>
        <button>Create Lesson</button>
      </form>

      <form className="card stack-10" onSubmit={updateLesson}>
        <h2 className="title-18">Edit Lesson</h2>
        <label>
          Lesson Key
          <input value={editKey} onChange={(e) => setEditKey(e.target.value)} placeholder="Click a row below" />
        </label>
        <div className="grid grid-2">
          <label>
            Lesson Title
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </label>
          <label>
            Status
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
        </div>
        <button className="secondary">Save Lesson Changes</button>
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
              <th>Lesson Key</th>
              <th>Module</th>
              <th>Lesson ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Sort</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.lesson_key}
                onClick={() => {
                  setEditKey(r.lesson_key);
                  setEditTitle(r.lesson_title || "");
                  setEditStatus(r.status || "DRAFT");
                }}
                className="cursor-pointer"
              >
                <td>{r.lesson_key}</td>
                <td>{r.module_id}</td>
                <td>{r.lesson_id}</td>
                <td>{r.lesson_title}</td>
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
