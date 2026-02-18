"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

interface Notification {
  notification_id: string;
  kind: string;
  title: string;
  body?: string;
  read: boolean;
  created_at: string;
}

interface NotifPayload {
  ok: boolean;
  data: { notifications: Notification[] };
}

const KIND_ICON: Record<string, string> = {
  xp_earned:        "⚡",
  badge_unlocked:   "🏅",
  event_reminder:   "📅",
  assignment_due:   "📝",
  quest_completed:  "🏆",
  kudos_received:   "🌟",
  raffle_result:    "🎟",
  announcement:     "📢",
  system:           "🔔",
};

const KIND_LABEL: Record<string, string> = {
  xp_earned:        "XP",
  badge_unlocked:   "Badge",
  event_reminder:   "Event",
  assignment_due:   "Assignment",
  quest_completed:  "Quest",
  kudos_received:   "Kudos",
  raffle_result:    "Raffle",
  announcement:     "Announcement",
  system:           "System",
};

function kindIcon(k: string) { return KIND_ICON[k] ?? "🔔"; }
function kindLabel(k: string) { return KIND_LABEL[k] ?? k.replace(/_/g, " "); }
function pillClass(k: string) {
  if (["xp_earned", "badge_unlocked", "quest_completed"].includes(k)) return "pill pill-brand";
  if (["kudos_received"].includes(k)) return "pill pill-success";
  if (["assignment_due", "event_reminder"].includes(k)) return "pill pill-warn";
  return "pill";
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<NotifPayload>("/api/notifications?limit=100");
      setItems(res.data.notifications ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="grid gap-5">
      <PageTitle
        title="Notifications"
        subtitle="In-portal alerts, updates, and event history"
      />

      <div className="action-bar">
        <button className="secondary" onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
        {unread > 0 && (
          <span className="pill pill-brand">{unread} unread</span>
        )}
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {busy && items.length === 0 && (
        <section className="card">
          <LoadingSkeleton lines={5} />
        </section>
      )}

      {!busy && items.length === 0 && !error && (
        <div className="empty-state">
          <h3>All clear</h3>
          <p>No notifications yet. Check back after completing activities or receiving kudos.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="table-wrap">
          <div className="feed-list">
            {items.map((n) => (
              <div key={n.notification_id} className="feed-row">
                {!n.read && <div className="unread-dot" title="Unread" />}
                <div className="feed-icon">{kindIcon(n.kind)}</div>
                <div className="feed-body">
                  <p className="feed-title">{n.title}</p>
                  {n.body && <p className="feed-detail">{n.body}</p>}
                </div>
                <div className="feed-meta">
                  <span className={pillClass(n.kind)}>{kindLabel(n.kind)}</span>
                  <span className="feed-time">{fmt(n.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
