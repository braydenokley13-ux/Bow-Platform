"use client";

import { useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

export default function AdminBroadcastPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [isError, setIsError] = useState(false);

  async function send() {
    if (!message.trim()) {
      setStatusMsg("Message cannot be empty.");
      setIsError(true);
      return;
    }
    setBusy(true);
    setStatusMsg("");
    setIsError(false);
    try {
      await apiFetch("/api/admin/broadcast", {
        method: "POST",
        json: { message: message.trim() }
      });
      setStatusMsg("Broadcast sent to all students.");
      setMessage("");
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Broadcast failed");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle
        title="Broadcast Message"
        subtitle="Send an in-portal notification to all students"
      />

      <section className="card stack-10">
        <label>
          Message
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your announcement here..."
            className="input-resize"
          />
        </label>
        <div>
          <button onClick={() => void send()} disabled={busy || !message.trim()}>
            {busy ? "Sending..." : "Send Broadcast"}
          </button>
        </div>
      </section>

      {statusMsg ? (
        <section className="card">
          <div className={`banner${isError ? " banner-error" : ""}`}>{statusMsg}</div>
        </section>
      ) : null}
    </div>
  );
}
