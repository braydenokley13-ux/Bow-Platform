"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface ChatMessage {
  id: string;
  authorEmail: string;
  authorName?: string;
  authorRole?: string;
  text: string;
  createdAt: string;
  moderated?: boolean;
}

interface MessagesPayload {
  ok: boolean;
  data: ChatMessage[];
}

export default function ChatPage() {
  const [text, setText] = useState("");
  const [sendBusy, setSendBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    try {
      const res = await apiFetch<MessagesPayload>("/api/chat/messages?limit=200");
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoadBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    setSendBusy(true);
    setSendError("");
    try {
      await apiFetch("/api/chat/messages", {
        method: "POST",
        json: { action: "post", text }
      });
      setText("");
      await loadMessages();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSendBusy(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Class Chat" subtitle="Live cohort discussion" />

      <form className="card stack-10" onSubmit={(e) => void sendMessage(e)}>
        <label>
          Message
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={1200}
            required
            placeholder="Share a thought, question, or insight with the class…"
          />
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button disabled={sendBusy || !text.trim()}>{sendBusy ? "Sending..." : "Send"}</button>
          <span style={{ fontSize: 12, opacity: 0.4 }}>{text.length}/1200</span>
        </div>
        {sendError ? <FeedbackBanner kind="error">{sendError}</FeedbackBanner> : null}
      </form>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="kicker">{messages.length} messages</span>
        <button className="secondary" onClick={() => void loadMessages()} disabled={loadBusy} style={{ fontSize: 13 }}>
          {loadBusy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loadError ? <FeedbackBanner kind="error">{loadError}</FeedbackBanner> : null}

      {loadBusy && messages.length === 0 ? (
        <LoadingSkeleton lines={5} />
      ) : messages.length === 0 ? (
        <EmptyState title="No messages yet" body="Be the first to post in the class chat." />
      ) : (
        <section className="card" style={{ display: "grid", gap: 0, padding: 0, maxHeight: 600, overflowY: "auto" }}>
          {messages.map((msg, idx) => {
            const isAdmin = msg.authorRole === "ADMIN" || msg.authorRole === "INSTRUCTOR";
            return (
              <div
                key={msg.id}
                style={{
                  padding: "12px 18px",
                  borderBottom: idx < messages.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none",
                  opacity: msg.moderated ? 0.4 : 1
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {msg.authorName ?? msg.authorEmail}
                  </span>
                  {isAdmin ? (
                    <span className="pill" style={{ fontSize: 10 }}>Staff</span>
                  ) : null}
                  <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.4, whiteSpace: "nowrap" }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="m-0" style={{ fontSize: 14, lineHeight: 1.5 }}>
                  {msg.moderated ? "[Message removed]" : msg.text}
                </p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </section>
      )}
    </div>
  );
}
