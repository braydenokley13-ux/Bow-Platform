"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";
import { apiFetch } from "@/lib/client-api";

export default function AssignmentsPage() {
  const [assignmentId, setAssignmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");

  async function onComplete(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    try {
      await apiFetch(`/api/assignments/${encodeURIComponent(assignmentId)}/mark-complete`, {
        method: "POST",
        json: { notes }
      });
      setMessageKind("success");
      setMessage("Assignment marked complete.");
    } catch (err) {
      setMessageKind("error");
      setMessage(err instanceof Error ? err.message : "Failed to mark assignment complete");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Assignments" subtitle="Track assignment tasks and completion" />
      <form className="card stack-10 max-w-540" onSubmit={onComplete}>
        <label>
          Assignment ID
          <input value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} required />
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>
        <button>Mark complete</button>
        {message ? (
          <div className={`banner ${messageKind === "error" ? "banner-error" : "banner-success"}`}>{message}</div>
        ) : null}
      </form>
      <FetchPanel endpoint="/api/assignments" title="My assignments" />
    </div>
  );
}
