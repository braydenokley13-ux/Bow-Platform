"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";
import { apiFetch } from "@/lib/client-api";

export default function ChatPage() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      await apiFetch("/api/chat/messages", {
        method: "POST",
        json: { action: "post", text }
      });
      setText("");
      setStatus("Message sent.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Class Chat" subtitle="Live cohort discussion" />
      <form className="card stack-10" onSubmit={sendMessage}>
        <label>
          Message
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1200} required />
        </label>
        <button disabled={busy}>{busy ? "Sending..." : "Send"}</button>
        {status ? <p className="m-0">{status}</p> : null}
      </form>
      <FetchPanel endpoint="/api/chat/messages?limit=200" title="Recent messages" />
    </div>
  );
}
