"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface Assignment {
  assignment_id: string;
  title: string;
  track: string;
  module: string;
  due_at?: string;
  enabled?: boolean;
  resource_url?: string;
}

interface AssignmentsPayload {
  ok: boolean;
  data: { assignments: Assignment[] };
}

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [track, setTrack] = useState("101");
  const [moduleId, setModuleId] = useState("1");
  const [dueAt, setDueAt] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [description, setDescription] = useState("");
  const [saveMsg, setSaveMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    try {
      const res = await apiFetch<AssignmentsPayload>("/api/admin/assignments");
      setAssignments(res.data?.assignments ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load assignments");
    } finally {
      setLoadBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaveBusy(true);
    setSaveMsg(null);
    try {
      await apiFetch("/api/admin/assignments", {
        method: "POST",
        json: { title, track, module: moduleId, due_at: dueAt, resource_url: resourceUrl, description, enabled: true }
      });
      setSaveMsg({ kind: "success", text: "Assignment saved." });
      setTitle("");
      setModuleId("1");
      setDueAt("");
      setResourceUrl("");
      setDescription("");
      await load();
    } catch (err) {
      setSaveMsg({ kind: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Assignments Manager" subtitle="Create or update assignment records" />

      <form className="card stack-10" onSubmit={(e) => void onSave(e)}>
        <h2 className="title-18">Create Assignment</h2>
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
        <button disabled={saveBusy}>{saveBusy ? "Saving..." : "Save assignment"}</button>
        {saveMsg ? (
          <div className={`banner ${saveMsg.kind === "error" ? "banner-error" : "banner-success"}`}>
            {saveMsg.text}
          </div>
        ) : null}
      </form>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="title-16" style={{ margin: 0 }}>Assignment List</h2>
        <button className="secondary" onClick={() => void load()} disabled={loadBusy} style={{ fontSize: 13 }}>
          {loadBusy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loadError ? <FeedbackBanner kind="error">{loadError}</FeedbackBanner> : null}

      {loadBusy && assignments.length === 0 ? (
        <LoadingSkeleton lines={4} />
      ) : assignments.length === 0 ? (
        <EmptyState title="No assignments yet" body="Create your first assignment above." />
      ) : (
        <section className="card" style={{ padding: 0 }}>
          <DataTable headers={["Title", "Track", "Module", "Due", "Enabled", "Resource"]} stickyHeader>
            {assignments.map((a) => (
              <tr key={a.assignment_id}>
                <td style={{ fontWeight: 500 }}>{a.title}</td>
                <td>{a.track}</td>
                <td>{a.module}</td>
                <td style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                  {a.due_at ? new Date(a.due_at).toLocaleDateString() : "—"}
                </td>
                <td>
                  <span
                    className="pill"
                    style={{
                      fontSize: 11,
                      color: a.enabled !== false ? "var(--success, #16a34a)" : "var(--muted, #6b7280)"
                    }}
                  >
                    {a.enabled !== false ? "Yes" : "No"}
                  </span>
                </td>
                <td>
                  {a.resource_url ? (
                    <a href={a.resource_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }}>
                      Open
                    </a>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </DataTable>
        </section>
      )}
    </div>
  );
}
