"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";
import { apiFetch } from "@/lib/client-api";

export default function AdminAssignmentsPage() {
  const [title, setTitle] = useState("");
  const [track, setTrack] = useState("101");
  const [moduleId, setModuleId] = useState("1");
  const [dueAt, setDueAt] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [description, setDescription] = useState("");
  const [msg, setMsg] = useState("");

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    try {
      await apiFetch("/api/admin/assignments", {
        method: "POST",
        json: {
          title,
          track,
          module: moduleId,
          due_at: dueAt,
          resource_url: resourceUrl,
          description,
          enabled: true
        }
      });
      setMsg("Assignment saved.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Assignments Manager" subtitle="Create or update assignment records" />
      <form className="card" onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
        <div className="grid grid-2">
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Track
            <select value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="101">101</option>
              <option value="201">201</option>
              <option value="301">301</option>
            </select>
          </label>
        </div>
        <div className="grid grid-2">
          <label>
            Module
            <input value={moduleId} onChange={(e) => setModuleId(e.target.value)} required />
          </label>
          <label>
            Due At (ISO)
            <input value={dueAt} onChange={(e) => setDueAt(e.target.value)} placeholder="2026-03-02T23:00:00-05:00" />
          </label>
        </div>
        <label>
          Resource URL
          <input value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} />
        </label>
        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>
        <button>Save assignment</button>
        {msg ? <p style={{ margin: 0 }}>{msg}</p> : null}
      </form>
      <FetchPanel endpoint="/api/admin/assignments" title="Assignment list" />
    </div>
  );
}
