"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

interface Announcement {
  announcement_id: string;
  title: string;
  body: string;
  kind: "info" | "warning" | "success";
  publish_at: string;
  expires_at?: string;
}

interface AnnouncementsPayload {
  ok: boolean;
  data: { announcements: Announcement[] };
}

const KIND_ICON: Record<string, string> = {
  info: "ℹ️",
  warning: "⚠️",
  success: "✅"
};

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch<AnnouncementsPayload>("/api/announcements")
      .then((json) => { if (json.ok) setItems(json.data.announcements ?? []); })
      .catch(() => {});
  }, []);

  async function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
    try {
      await apiFetch("/api/announcements", {
        method: "POST",
        body: JSON.stringify({ announcement_id: id }),
      });
    } catch {
      // best-effort dismiss; don't re-show on error
    }
  }

  const visible = items.filter((a) => !dismissed.has(a.announcement_id));
  if (visible.length === 0) return null;

  return (
    <div className="announcement-stack">
      {visible.map((a) => {
        const kind = KIND_ICON[a.kind] ? a.kind : "info";
        return (
          <div key={a.announcement_id} role="alert" className={`announcement ${kind}`}>
            <span className="announcement-icon">{KIND_ICON[kind]}</span>
            <div className="announcement-copy">
              {a.title && (
                <p className="announcement-title">{a.title}</p>
              )}
              {a.body && <p className="announcement-body">{a.body}</p>}
            </div>
            <button
              type="button"
              className="announcement-close"
              onClick={() => void dismiss(a.announcement_id)}
              aria-label="Dismiss announcement"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
