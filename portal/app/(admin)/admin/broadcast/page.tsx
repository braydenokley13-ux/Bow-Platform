"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

const KIND_OPTIONS = ["INFO", "QUEST", "SUPPORT", "CLAIM", "RAFFLE", "EVENT", "JOURNAL", "ACCOUNT", "POD", "ASSIGNMENT"] as const;

export default function AdminBroadcastPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("INFO");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ recipient_count: number; title: string } | null>(null);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (!confirm(`Send "${title}" to ALL active students? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    setResult(null);
    try {
      const json = await apiFetch<{ ok: boolean; data: { recipient_count: number; title: string } }>(
        "/api/admin/broadcast",
        {
          method: "POST",
          json: { title: title.trim(), body: body.trim(), kind }
        }
      );
      setResult(json.data);
      setTitle("");
      setBody("");
      setKind("INFO");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Broadcast Message"
        subtitle="Send an instant in-portal notification to every active student at once"
      />

      <div className="banner" style={{ borderColor: "var(--warning, #f59e0b)", background: "rgba(245,158,11,0.08)" }}>
        <strong>Heads up:</strong> Broadcasts fire immediately to all active students. Use for urgent announcements only. For scheduled banners, use <a href="/admin/announcements">Portal Announcements</a>.
      </div>

      <form className="card" onSubmit={(e) => void onSend(e)} style={{ display: "grid", gap: 10, maxWidth: 600 }}>
        <div className="grid grid-2">
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Office hours moved to Friday"
              required
            />
          </label>
          <label>
            Notification type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Message body
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Full message visible in each student's notification inbox..."
            required
            style={{ resize: "vertical" }}
          />
        </label>
        <button disabled={saving} style={{ background: "var(--accent)", color: "#000", fontWeight: 700 }}>
          {saving ? "Sending..." : "Send to all students"}
        </button>
      </form>

      {error ? <div className="banner banner-error">{error}</div> : null}

      {result ? (
        <div className="banner banner-success">
          Broadcast sent to <strong>{result.recipient_count}</strong> student{result.recipient_count !== 1 ? "s" : ""}: &ldquo;{result.title}&rdquo;
        </div>
      ) : null}
    </div>
  );
}
