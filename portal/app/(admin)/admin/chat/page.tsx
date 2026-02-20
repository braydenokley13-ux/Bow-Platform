"use client";

import { useCallback, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
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

export default function AdminChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadBusy, setLoadBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [moderateMsg, setModerateMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    try {
      const res = await apiFetch<MessagesPayload>("/api/admin/chat?limit=300");
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoadBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(messageId: string) {
    setModeratingId(messageId);
    setModerateMsg(null);
    try {
      await apiFetch("/api/admin/chat/moderate", {
        method: "POST",
        json: { messageId }
      });
      setModerateMsg({ kind: "success", text: `Message ${messageId} moderated.` });
      await load();
    } catch (err) {
      setModerateMsg({ kind: "error", text: err instanceof Error ? err.message : "Moderation failed" });
    } finally {
      setModeratingId(null);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Chat Moderation" subtitle="View messages and remove problematic posts" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="kicker">{messages.length} messages loaded</span>
        <button className="secondary" onClick={() => void load()} disabled={loadBusy} style={{ fontSize: 13 }}>
          {loadBusy ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {moderateMsg ? (
        <FeedbackBanner kind={moderateMsg.kind}>{moderateMsg.text}</FeedbackBanner>
      ) : null}
      {loadError ? <FeedbackBanner kind="error">{loadError}</FeedbackBanner> : null}

      {loadBusy && messages.length === 0 ? (
        <LoadingSkeleton lines={6} />
      ) : messages.length === 0 ? (
        <EmptyState title="No messages" body="No chat messages to display." />
      ) : (
        <section className="card" style={{ padding: 0 }}>
          <DataTable headers={["Time", "Author", "Role", "Message", "Status", "Action"]} stickyHeader>
            {messages.map((msg) => {
              const isModeratingThis = moderatingId === msg.id;
              return (
                <tr key={msg.id} style={{ opacity: msg.moderated ? 0.45 : 1 }}>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {msg.authorName ?? msg.authorEmail}
                    <div style={{ fontSize: 11, opacity: 0.5 }}>{msg.authorEmail}</div>
                  </td>
                  <td>
                    {msg.authorRole ? (
                      <span className="pill" style={{ fontSize: 11 }}>{msg.authorRole}</span>
                    ) : "—"}
                  </td>
                  <td style={{ maxWidth: 400, fontSize: 13 }}>
                    {msg.moderated ? (
                      <span style={{ opacity: 0.5, fontStyle: "italic" }}>[Moderated]</span>
                    ) : msg.text}
                  </td>
                  <td>
                    <span className="pill" style={{ fontSize: 11 }}>
                      {msg.moderated ? "Removed" : "Active"}
                    </span>
                  </td>
                  <td>
                    {!msg.moderated ? (
                      <button
                        className="danger"
                        style={{ fontSize: 12, padding: "4px 10px" }}
                        disabled={isModeratingThis}
                        onClick={() => void moderate(msg.id)}
                      >
                        {isModeratingThis ? "..." : "Remove"}
                      </button>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </section>
      )}
    </div>
  );
}
