"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ProgramRow {
  program_id: string;
  name: string;
  version_label: string;
  age_group: string;
  status: string;
  sort_order: number;
  updated_at?: string;
  updated_by?: string;
}

interface Envelope<T> {
  ok: boolean;
  data: T;
}

export default function CurriculumProgramsPage() {
  const [rows, setRows] = useState<ProgramRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [newName, setNewName] = useState("");
  const [newVersion, setNewVersion] = useState("v1");
  const [newAgeGroup, setNewAgeGroup] = useState("Cohort");

  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("DRAFT");

  async function load() {
    setBusy(true);
    setMessage("");
    try {
      const json = await apiFetch<Envelope<ProgramRow[]>>("/api/admin/curriculum/draft/programs");
      setRows(json.data || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load programs");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProgram(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      await apiFetch("/api/admin/curriculum/draft/programs", {
        method: "POST",
        json: {
          name: newName,
          version_label: newVersion,
          age_group: newAgeGroup,
          status: "DRAFT"
        }
      });
      setNewName("");
      setMessage("Program created.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function updateProgram(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!editId) {
      setMessage("Select a program from the table first.");
      return;
    }

    try {
      await apiFetch(`/api/admin/curriculum/draft/programs/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        json: {
          name: editName,
          status: editStatus
        }
      });
      setMessage("Program updated.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Curriculum Programs" subtitle="Create and edit top-level programs" />

      <section className="card row-8-center">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh"}
        </button>
        <span className="pill">Programs: {rows.length}</span>
      </section>

      <form className="card" onSubmit={createProgram} style={{ display: "grid", gap: 10 }}>
        <h2 className="title-18">Create Program</h2>
        <div className="grid grid-2">
          <label>
            Name
            <input value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </label>
          <label>
            Version Label
            <input value={newVersion} onChange={(e) => setNewVersion(e.target.value)} required />
          </label>
        </div>
        <label>
          Age Group
          <input value={newAgeGroup} onChange={(e) => setNewAgeGroup(e.target.value)} />
        </label>
        <button>Create Program</button>
      </form>

      <form className="card" onSubmit={updateProgram} style={{ display: "grid", gap: 10 }}>
        <h2 className="title-18">Edit Program</h2>
        <label>
          Program ID
          <input value={editId} onChange={(e) => setEditId(e.target.value)} placeholder="Click a row below" />
        </label>
        <div className="grid grid-2">
          <label>
            Name
            <input value={editName} onChange={(e) => setEditName(e.target.value)} />
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
        <button className="secondary">Save Program Changes</button>
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
              <th>ID</th>
              <th>Name</th>
              <th>Version</th>
              <th>Age Group</th>
              <th>Status</th>
              <th>Sort</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.program_id}
                onClick={() => {
                  setEditId(r.program_id);
                  setEditName(r.name || "");
                  setEditStatus(r.status || "DRAFT");
                }}
                style={{ cursor: "pointer" }}
              >
                <td>{r.program_id}</td>
                <td>{r.name}</td>
                <td>{r.version_label}</td>
                <td>{r.age_group}</td>
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
