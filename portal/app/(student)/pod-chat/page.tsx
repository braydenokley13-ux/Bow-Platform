"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ChatMessage {
  message_id: string;
  author_email: string;
  author_name?: string;
  message: string;
  sent_at: string;
  is_mine?: boolean;
}

interface ChatPayload {
  ok: boolean;
  data: { messages: ChatMessage[]; has_more?: boolean; cursor?: string; pod_name?: string };
}

export default function PodChatPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState("");
  const [podName, setPodName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (prepend = false, cursorToken = "") => {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "40" });
      if (prepend && cursorToken) params.set("cursor", cursorToken);
      const res = await apiFetch<ChatPayload>(`/api/pod-chat?${params}`);
      const incoming = res.data.messages ?? [];
      setMessages((prev) => (prepend ? [...incoming, ...prev] : incoming));
      setCursor(res.data.cursor ?? "");
      setHasMore(res.data.has_more ?? false);
      if (res.data.pod_name) setPodName(res.data.pod_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pod chat");
    } finally {
      setBusy(false);
    }
  }, []);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch("/api/pod-chat", { method: "POST", json: { message: draft.trim() } });
      setDraft("");
      await load();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="grid gap-14">
      <PageTitle
        title={podName ? `Pod Chat — ${podName}` : "Pod Chat"}
        subtitle="Private thread for your pod — coordinate, share notes, and strategize"
      />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}

      {hasMore ? (
        <section className="card">
          <button className="secondary" onClick={() => void load(true, cursor)} disabled={busy}>
            {busy ? "Loading..." : "Load older messages"}
          </button>
        </section>
      ) : null}

      <section className="card p-0">
        {!busy && messages.length === 0 ? (
          <p style={{ margin: 16, opacity: 0.6 }}>
            No messages yet. Say hi to your pod!
          </p>
        ) : null}

        <div style={{ display: "grid" }}>
          {messages.map((m, idx) => {
            const isMe = m.is_mine ?? false;
            const showAuthor =
              idx === 0 || messages[idx - 1].author_email !== m.author_email;

            return (
              <div
                key={m.message_id}
                style={{
                  padding: showAuthor ? "12px 16px 6px" : "3px 16px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start"
                }}
              >
                {showAuthor ? (
                  <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>
                    {isMe ? "You" : (m.author_name ?? m.author_email)} ·{" "}
                    {new Date(m.sent_at).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                ) : null}
                <div
                  style={{
                    maxWidth: "75%",
                    padding: "8px 12px",
                    borderRadius: 12,
                    background: isMe ? "var(--accent, #2563eb)" : "var(--bg2, #f3f4f6)",
                    color: isMe ? "#fff" : "inherit",
                    fontSize: 14,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}
                >
                  {m.message}
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </section>

      <section className="card stack-8">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          maxLength={1000}
          placeholder="Message your pod... (Ctrl+Enter to send)"
          className="input-resize"
        />
        <div className="row-8-center">
          <button onClick={() => void send()} disabled={sending || !draft.trim()}>
            {sending ? "Sending..." : "Send"}
          </button>
          <span style={{ fontSize: 12, opacity: 0.4 }}>Ctrl+Enter to send</span>
          <button className="secondary ml-auto" onClick={() => void load()} disabled={busy}>
            Refresh
          </button>
        </div>
      </section>
    </div>
  );
}
