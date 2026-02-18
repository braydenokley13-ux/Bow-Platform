"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface GoalPayload {
  ok: boolean;
  data: {
    goal: string | null;
    updated_at?: string;
  };
}

export default function GoalPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<GoalPayload>("/api/me/goal");
      const goal = res.data.goal ?? "";
      setSaved(goal);
      setDraft(goal);
      setUpdatedAt(res.data.updated_at ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goal");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<GoalPayload>("/api/me/goal", {
        method: "POST",
        json: { goal: draft }
      });
      const goal = res.data.goal ?? draft;
      setSaved(goal);
      setDraft(goal);
      setUpdatedAt(res.data.updated_at ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save goal");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const isDirty = draft !== saved;

  return (
    <div className="grid gap-14">
      <PageTitle
        title="Season Goal"
        subtitle="Set one goal for the season — it stays pinned on your profile all semester"
      />

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {saved ? (
        <section className="card">
          <div className="kicker">Your Current Goal</div>
          <p style={{ margin: "8px 0 0", fontSize: 18, fontWeight: 600 }}>{saved}</p>
          {updatedAt ? (
            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.6 }}>
              Last updated {new Date(updatedAt).toLocaleDateString()}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="card stack-10">
        <label>
          {saved ? "Update your goal" : "Set your season goal"}
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            placeholder='e.g. "Reach the top 5 on the leaderboard by Week 8"'
            className="input-resize"
          />
        </label>
        <div className="row-8-center">
          <button onClick={() => void save()} disabled={busy || !draft.trim() || !isDirty}>
            {busy ? "Saving..." : saved ? "Update Goal" : "Set Goal"}
          </button>
          {isDirty && saved ? (
            <button className="secondary" onClick={() => setDraft(saved ?? "")}>
              Discard
            </button>
          ) : null}
          <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.5 }}>
            {draft.length}/500
          </span>
        </div>
      </section>
    </div>
  );
}
