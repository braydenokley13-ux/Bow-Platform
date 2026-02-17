"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";
import { apiFetch } from "@/lib/client-api";

export default function ActionQueuePage() {
  const [actionId, setActionId] = useState("");
  const [msg, setMsg] = useState("");

  async function onRun(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await apiFetch(`/api/admin/action-queue/${encodeURIComponent(actionId)}/run`, {
        method: "POST"
      });
      setMsg("Action executed.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Run failed");
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Action Queue" subtitle="Run queued admin actions" />
      <form className="card" onSubmit={onRun} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <label>
          Action ID
          <input value={actionId} onChange={(e) => setActionId(e.target.value)} required />
        </label>
        <button>Run action</button>
        {msg ? <p style={{ margin: 0 }}>{msg}</p> : null}
      </form>
      <FetchPanel endpoint="/api/admin/action-queue" title="Queue items" />
    </div>
  );
}
