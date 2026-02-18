"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";
import { apiFetch } from "@/lib/client-api";

export default function AdminChatPage() {
  const [messageId, setMessageId] = useState("");
  const [msg, setMsg] = useState("");

  async function onModerate(e: FormEvent) {
    e.preventDefault();
    setMsg("");

    try {
      await apiFetch("/api/admin/chat/moderate", {
        method: "POST",
        json: { messageId }
      });
      setMsg("Message moderated.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Moderation failed");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Chat Moderation" subtitle="View messages and remove problematic posts" />
      <form className="card stack-10 max-w-520" onSubmit={onModerate}>
        <label>
          Message ID to moderate
          <input value={messageId} onChange={(e) => setMessageId(e.target.value)} required />
        </label>
        <button className="danger">Moderate message</button>
        {msg ? <p className="m-0">{msg}</p> : null}
      </form>
      <FetchPanel endpoint="/api/admin/chat?limit=300" title="Recent chat messages" />
    </div>
  );
}
