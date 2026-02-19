"use client";

import { useEffect, useState, useCallback } from "react";
import { PageTitle } from "@/components/page-title";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface Notification {
  notification_id: string;
  title: string;
  body: string;
  kind: string;
  status: string;
  created_at: string;
  read_at?: string;
}

interface NotificationsPayload {
  ok: boolean;
  data: Notification[];
}

export default function NotificationsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<NotificationsPayload>("/api/notifications?limit=100");
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = items.filter((n) => n.status !== "read").length;

  return (
    <div className="grid gap-14">
      <PageTitle title="Notifications" subtitle="In-portal event history" />

      {unreadCount > 0 ? (
        <section className="card">
          <p className="m-0">
            <strong>{unreadCount}</strong> unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </section>
      ) : null}

      {error ? <FeedbackBanner kind="error">{error}</FeedbackBanner> : null}

      {busy ? (
        <LoadingSkeleton lines={5} />
      ) : items.length === 0 ? (
        <EmptyState title="Inbox is clear" body="No notifications yet. Check back after class activity." />
      ) : (
        <section className="card" style={{ display: "grid", gap: 0, padding: 0 }}>
          {items.map((n, idx) => {
            const isUnread = n.status !== "read";
            return (
              <div
                key={n.notification_id}
                style={{
                  padding: "14px 18px",
                  borderBottom: idx < items.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none",
                  borderLeft: isUnread ? "3px solid var(--accent, #3b82f6)" : "3px solid transparent",
                  display: "grid",
                  gap: 4
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontWeight: isUnread ? 700 : 500 }}>{n.title}</span>
                  <span style={{ fontSize: 12, opacity: 0.45, whiteSpace: "nowrap" }}>
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="m-0" style={{ fontSize: 14, opacity: 0.75 }}>{n.body}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                  <span className="pill" style={{ fontSize: 11 }}>{n.kind}</span>
                  {isUnread ? <span className="pill" style={{ fontSize: 11 }}>Unread</span> : null}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
