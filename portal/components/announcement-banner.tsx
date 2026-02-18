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

const KIND_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  info:    { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8", icon: "ℹ️" },
  warning: { bg: "#fffbeb", border: "#f59e0b", color: "#92400e", icon: "⚠️" },
  success: { bg: "#f0fdf4", border: "#22c55e", color: "#166534", icon: "✅" },
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
    <div style={{ display: "grid", gap: 8, marginBottom: 4 }}>
      {visible.map((a) => {
        const style = KIND_STYLES[a.kind] ?? KIND_STYLES.info;
        return (
          <div
            key={a.announcement_id}
            role="alert"
            style={{
              background: style.bg,
              border: `1.5px solid ${style.border}`,
              borderRadius: 10,
              padding: "11px 16px",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              color: style.color,
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{style.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {a.title && (
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: a.body ? 3 : 0 }}>
                  {a.title}
                </div>
              )}
              {a.body && (
                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{a.body}</div>
              )}
            </div>
            <button
              onClick={() => void dismiss(a.announcement_id)}
              aria-label="Dismiss announcement"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: style.color,
                fontSize: 18,
                lineHeight: 1,
                padding: "0 4px",
                opacity: 0.6,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
