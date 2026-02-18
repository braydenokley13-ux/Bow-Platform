"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface PreviewDashboard {
  email?: string;
  display_name?: string;
  xp?: number;
  level?: number;
  streak_days?: number;
}

interface PreviewNotification {
  notification_id: string;
  title: string;
  body: string;
  kind: string;
  status: string;
  created_at: string;
}

interface PreviewData {
  target_email: string;
  dashboard: PreviewDashboard | null;
  quests: unknown;
  recent_notifications: PreviewNotification[];
  league_standings: unknown;
}

export default function AdminPreviewPage() {
  const [email, setEmail] = useState("");
  const [data, setData] = useState<PreviewData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "quests" | "notifications" | "standings">("dashboard");

  async function onPreview(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setData(null);
    try {
      const json = await apiFetch<{ ok: boolean; data: PreviewData }>(
        `/api/admin/preview?email=${encodeURIComponent(email.trim().toLowerCase())}`
      );
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student preview");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "quests", label: "Quests" },
    { key: "notifications", label: "Notifications" },
    { key: "standings", label: "League" }
  ];

  return (
    <div className="grid gap-14">
      <PageTitle
        title="View As Student"
        subtitle="Preview the portal exactly as a specific student sees it — for debugging and support"
      />

      <div className="banner preview-mode-banner">
        <strong>Preview mode</strong> reads live data for the selected student but does not modify any records. You are still authenticated as an admin.
      </div>

      <form className="card preview-form" onSubmit={(e) => void onPreview(e)}>
        <label className="preview-form-label">
          Student email to preview as
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@example.com"
            required
          />
        </label>
        <button disabled={busy}>{busy ? "Loading..." : "Preview as student"}</button>
        {data ? (
          <button type="button" onClick={() => { setData(null); setEmail(""); }} className="secondary preview-exit-button">
            Exit preview
          </button>
        ) : null}
      </form>

      {error ? <div className="banner banner-error">{error}</div> : null}

      {data ? (
        <>
          <div className="preview-active-banner">
            <span className="preview-active-email">Previewing as: {data.target_email}</span>
            <button onClick={() => { setData(null); setEmail(""); }} className="btn-xs preview-exit-quick">
              Exit preview
            </button>
          </div>

          {data.dashboard ? (
            <section className="card row-20-wrap">
              {[
                { label: "Display name", value: (data.dashboard as PreviewDashboard).display_name ?? data.target_email },
                { label: "XP", value: ((data.dashboard as PreviewDashboard).xp ?? 0).toLocaleString() },
                { label: "Level", value: (data.dashboard as PreviewDashboard).level ?? "—" },
                { label: "Day streak", value: (data.dashboard as PreviewDashboard).streak_days ?? 0 }
              ].map(({ label, value }) => (
                <div key={label} className="preview-stat-item">
                  <div className="preview-stat-value">{value}</div>
                  <div className="preview-stat-label">{label}</div>
                </div>
              ))}
            </section>
          ) : null}

          <div className="row-4-wrap">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`preview-tab-btn${activeTab === key ? " active" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="card">
            {activeTab === "dashboard" && (
              <pre className="json-pre">{JSON.stringify(data.dashboard, null, 2)}</pre>
            )}
            {activeTab === "quests" && (
              <pre className="json-pre">{JSON.stringify(data.quests, null, 2)}</pre>
            )}
            {activeTab === "notifications" && (
              <div className="stack-8">
                {Array.isArray(data.recent_notifications) && data.recent_notifications.length > 0 ? (
                  data.recent_notifications.map((n) => (
                    <div key={n.notification_id} className={`preview-notification${n.status === "READ" ? " is-read" : ""}`}>
                      <div className="preview-notification-head">
                        <span className="preview-notification-title">{n.title}</span>
                        <div className="row-8">
                          <span className="pill fs-11">{n.kind}</span>
                          <span className="muted-11">{n.status}</span>
                        </div>
                      </div>
                      <div className="muted-13 mt-4">{n.body}</div>
                      <div className="muted-11 mt-4">{n.created_at}</div>
                    </div>
                  ))
                ) : (
                  <p className="m-0 text-muted">No notifications.</p>
                )}
              </div>
            )}
            {activeTab === "standings" && (
              <pre className="json-pre">{JSON.stringify(data.league_standings, null, 2)}</pre>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
