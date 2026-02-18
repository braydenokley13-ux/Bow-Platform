"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ChangelogEntry {
  entry_id: string;
  title: string;
  body: string;
  category: "feature" | "fix" | "improvement" | "note";
  published_at: string;
}

interface ChangelogPayload {
  ok: boolean;
  data: ChangelogEntry[];
}

const CATEGORIES = [
  { value: "feature", label: "New Feature" },
  { value: "fix", label: "Bug Fix" },
  { value: "improvement", label: "Improvement" },
  { value: "note", label: "Note" }
] as const;

export default function AdminChangelogPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<"feature" | "fix" | "improvement" | "note">("feature");
  const [posting, setPosting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ChangelogPayload>("/api/admin/changelog");
      setEntries(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load changelog");
    } finally {
      setBusy(false);
    }
  }

  async function post() {
    setPosting(true);
    setStatusMsg("");
    setError(null);
    try {
      await apiFetch("/api/admin/changelog", {
        method: "POST",
        json: { title: title.trim(), body: body.trim(), category }
      });
      setTitle("");
      setBody("");
      setCategory("feature");
      setStatusMsg("Entry published. Students can see it on the What's New page.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post entry");
    } finally {
      setPosting(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-14">
      <PageTitle
        title="Portal Changelog"
        subtitle="Publish updates that appear on the student What's New page"
      />

      {statusMsg ? (
        <section className="card">
          <div className="banner">{statusMsg}</div>
        </section>
      ) : null}

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="card stack-10">
        <h2 className="title-18">New Entry</h2>
        <div className="grid grid-2">
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Daily Check-In Streak is live"
            />
          </label>
        </div>
        <label>
          Details
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            placeholder="Describe what changed and how it affects students..."
            className="input-resize"
          />
        </label>
        <div>
          <button
            onClick={() => void post()}
            disabled={posting || !title.trim() || !body.trim()}
          >
            {posting ? "Publishing..." : "Publish Entry"}
          </button>
        </div>
      </section>

      <section className="card stack-8">
        <div className="row-8-center">
          <h2 className="title-18">Published Entries ({entries.length})</h2>
          <button className="secondary" onClick={() => void load()} disabled={busy}>
            {busy ? "Loading..." : "Refresh"}
          </button>
        </div>

        {entries.length === 0 && !busy ? (
          <p className="m-0 text-muted-60">No entries yet.</p>
        ) : null}

        {entries.map((entry) => (
          <article
            key={entry.entry_id}
            style={{
              padding: "10px 0",
              borderBottom: "1px solid var(--border, #e5e7eb)",
              display: "grid",
              gap: 4
            }}
          >
            <div className="row-8-center-wrap">
              <span className="pill">{entry.category}</span>
              <strong>{entry.title}</strong>
              <span style={{ opacity: 0.45, fontSize: 12, marginLeft: "auto" }}>
                {new Date(entry.published_at).toLocaleDateString()}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.7, whiteSpace: "pre-wrap" }}>{entry.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
