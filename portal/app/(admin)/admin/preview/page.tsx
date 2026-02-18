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

      <div className="banner" style={{ borderColor: "#3b82f6", background: "rgba(59,130,246,0.08)" }}>
        <strong>Preview mode</strong> reads live data for the selected student but does not modify any records. You are still authenticated as an admin.
      </div>

      <form className="card" onSubmit={(e) => void onPreview(e)} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={{ flex: 1, minWidth: 260 }}>
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
          <button type="button" onClick={() => { setData(null); setEmail(""); }} style={{ opacity: 0.7 }}>
            Exit preview
          </button>
        ) : null}
      </form>

      {error ? <div className="banner banner-error">{error}</div> : null}

      {data ? (
        <>
          {/* Preview banner */}
          <div
            style={{
              background: "#1e3a5f",
              border: "2px solid #3b82f6",
              borderRadius: 8,
              padding: "10px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8
            }}
          >
            <span style={{ fontWeight: 700, color: "#93c5fd", fontSize: 14 }}>
              Previewing as: {data.target_email}
            </span>
            <button
              onClick={() => { setData(null); setEmail(""); }}
              style={{ fontSize: 12, padding: "3px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
            >
              Exit preview
            </button>
          </div>

          {/* Quick stats */}
          {data.dashboard ? (
            <section className="card row-20-wrap">
              {[
                { label: "Display name", value: (data.dashboard as PreviewDashboard).display_name ?? data.target_email },
                { label: "XP", value: ((data.dashboard as PreviewDashboard).xp ?? 0).toLocaleString() },
                { label: "Level", value: (data.dashboard as PreviewDashboard).level ?? "—" },
                { label: "Day streak", value: (data.dashboard as PreviewDashboard).streak_days ?? 0 }
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
                  <div style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                </div>
              ))}
            </section>
          ) : null}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "6px 16px",
                  fontWeight: activeTab === key ? 800 : 400,
                  background: activeTab === key ? "var(--accent)" : "var(--surface)",
                  color: activeTab === key ? "#000" : "var(--fg)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <section className="card">
            {activeTab === "dashboard" && (
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", overflowX: "auto" }}>
                {JSON.stringify(data.dashboard, null, 2)}
              </pre>
            )}
            {activeTab === "quests" && (
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", overflowX: "auto" }}>
                {JSON.stringify(data.quests, null, 2)}
              </pre>
            )}
            {activeTab === "notifications" && (
              <div style={{ display: "grid", gap: 8 }}>
                {Array.isArray(data.recent_notifications) && data.recent_notifications.length > 0 ? (
                  data.recent_notifications.map((n) => (
                    <div
                      key={n.notification_id}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        padding: "10px 12px",
                        opacity: n.status === "READ" ? 0.6 : 1
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{n.title}</span>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span className="pill" style={{ fontSize: 11 }}>{n.kind}</span>
                          <span style={{ color: "var(--muted)", fontSize: 11 }}>{n.status}</span>
                        </div>
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{n.body}</div>
                      <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 4 }}>{n.created_at}</div>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--muted)", margin: 0 }}>No notifications.</p>
                )}
              </div>
            )}
            {activeTab === "standings" && (
              <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", overflowX: "auto" }}>
                {JSON.stringify(data.league_standings, null, 2)}
              </pre>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
