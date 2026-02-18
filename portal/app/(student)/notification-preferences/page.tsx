"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Prefs {
  shoutouts: boolean;
  assignments: boolean;
  leaderboard_changes: boolean;
  instructor_announcements: boolean;
  session_recaps: boolean;
}

interface PrefsPayload {
  ok: boolean;
  data: Prefs;
}

const PREF_ITEMS: Array<{ key: keyof Prefs; label: string; description: string }> = [
  {
    key: "shoutouts",
    label: "Peer Shoutouts",
    description: "When a classmate sends you a kudos or shoutout."
  },
  {
    key: "assignments",
    label: "Assignments",
    description: "New assignments posted or grading feedback received."
  },
  {
    key: "leaderboard_changes",
    label: "Leaderboard Changes",
    description: "When your rank changes significantly week-over-week."
  },
  {
    key: "instructor_announcements",
    label: "Instructor Announcements",
    description: "Broadcast messages and important updates from your instructor."
  },
  {
    key: "session_recaps",
    label: "Session Recaps",
    description: "When a new class recap is published after a live session."
  }
];

const DEFAULT_PREFS: Prefs = {
  shoutouts: true,
  assignments: true,
  leaderboard_changes: true,
  instructor_announcements: true,
  session_recaps: true
};

export default function NotificationPreferencesPage() {
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<PrefsPayload>("/api/me/notification-preferences");
      setPrefs({ ...DEFAULT_PREFS, ...res.data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preferences");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setSaving(true);
    setStatusMsg("");
    setError(null);
    try {
      await apiFetch("/api/me/notification-preferences", {
        method: "POST",
        json: prefs
      });
      setStatusMsg("Preferences saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof Prefs) {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setStatusMsg("");
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Notification Preferences"
        subtitle="Choose which in-portal notifications you want to receive"
      />

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {statusMsg ? (
        <section className="card">
          <div className="banner">{statusMsg}</div>
        </section>
      ) : null}

      <section className="card" style={{ display: "grid", gap: 0 }}>
        {PREF_ITEMS.map((item, idx) => (
          <div
            key={item.key}
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              padding: "14px 0",
              borderBottom: idx < PREF_ITEMS.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none"
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{item.label}</div>
              <div style={{ fontSize: 13, opacity: 0.6, marginTop: 2 }}>{item.description}</div>
            </div>
            <label
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}
            >
              <input
                type="checkbox"
                checked={prefs[item.key]}
                onChange={() => toggle(item.key)}
                disabled={busy}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span style={{ fontSize: 14 }}>{prefs[item.key] ? "On" : "Off"}</span>
            </label>
          </div>
        ))}
      </section>

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => void save()} disabled={saving || busy}>
          {saving ? "Saving..." : "Save Preferences"}
        </button>
        <button
          className="secondary"
          onClick={() => setPrefs(DEFAULT_PREFS)}
          disabled={saving}
        >
          Reset to defaults
        </button>
      </section>
    </div>
  );
}
