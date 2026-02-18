"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface ProgramRow {
  program_id: string;
  name: string;
}

interface ModuleRow {
  module_id: string;
  program_id: string;
  module_title: string;
  core_competency: string;
  description: string;
  sort_order: number;
  status: string;
  updated_at?: string;
}

export default function CurriculumModulesPage() {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [programId, setProgramId] = useState("");
  const [rows, setRows] = useState<ModuleRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newCompetency, setNewCompetency] = useState("Decision Making");
  const [newDescription, setNewDescription] = useState("");

  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState("DRAFT");

  async function loadPrograms() {
    const json = await apiFetch<Envelope<ProgramRow[]>>("/api/admin/curriculum/draft/programs");
    const items = json.data || [];
    setPrograms(items);
    if (!programId && items.length) setProgramId(items[0].program_id);
  }

  async function loadModules(pid: string) {
    setBusy(true);
    setMessage("");
    try {
      const url = pid
        ? `/api/admin/curriculum/draft/modules?programId=${encodeURIComponent(pid)}`
        : "/api/admin/curriculum/draft/modules";
      const json = await apiFetch<Envelope<ModuleRow[]>>(url);
      setRows(json.data || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load modules");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadPrograms();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Failed to load programs");
      }
    })();
  }, []);

  useEffect(() => {
    void loadModules(programId);
  }, [programId]);

  async function createModule(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!programId) {
      setMessage("Select a program first.");
      return;
    }

    try {
      await apiFetch("/api/admin/curriculum/draft/modules", {
        method: "POST",
        json: {
          program_id: programId,
          module_title: newModuleTitle,
          core_competency: newCompetency,
          description: newDescription,
          status: "DRAFT"
        }
      });
      setNewModuleTitle("");
      setNewDescription("");
      setMessage("Module created.");
      await loadModules(programId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function updateModule(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!editId) {
      setMessage("Select a module row first.");
      return;
    }

    try {
      await apiFetch(`/api/admin/curriculum/draft/modules/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        json: {
          module_title: editTitle,
          status: editStatus
        }
      });
      setMessage("Module updated.");
      await loadModules(programId);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Curriculum Modules" subtitle="Manage module blocks inside each program" />

      <section className="card stack-10">
        <div className="grid grid-2">
          <label>
            Program Filter
            <select value={programId} onChange={(e) => setProgramId(e.target.value)}>
              {programs.map((p) => (
                <option key={p.program_id} value={p.program_id}>
                  {p.name} ({p.program_id})
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={() => void loadModules(programId)} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh Modules"}
            </button>
          </div>
        </div>
      </section>

      <form className="card" onSubmit={createModule} style={{ display: "grid", gap: 10 }}>
        <h2 className="title-18">Create Module</h2>
        <label>
          Module Title
          <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} required />
        </label>
        <div className="grid grid-2">
          <label>
            Core Competency
            <input value={newCompetency} onChange={(e) => setNewCompetency(e.target.value)} />
          </label>
          <label>
            Description
            <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
          </label>
        </div>
        <button>Create Module</button>
      </form>

      <form className="card" onSubmit={updateModule} style={{ display: "grid", gap: 10 }}>
        <h2 className="title-18">Edit Module</h2>
        <label>
          Module ID
          <input value={editId} onChange={(e) => setEditId(e.target.value)} placeholder="Click a row below" />
        </label>
        <div className="grid grid-2">
          <label>
            Module Title
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
        <button className="secondary">Save Module Changes</button>
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
              <th>Module ID</th>
              <th>Program</th>
              <th>Title</th>
              <th>Competency</th>
              <th>Status</th>
              <th>Sort</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.module_id}
                onClick={() => {
                  setEditId(r.module_id);
                  setEditTitle(r.module_title || "");
                  setEditStatus(r.status || "DRAFT");
                }}
                style={{ cursor: "pointer" }}
              >
                <td>{r.module_id}</td>
                <td>{r.program_id}</td>
                <td>{r.module_title}</td>
                <td>{r.core_competency}</td>
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
