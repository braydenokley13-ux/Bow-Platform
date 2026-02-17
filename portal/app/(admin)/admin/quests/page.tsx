"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface QuestRow {
  quest_id: string;
  title: string;
  description: string;
  target_type: string;
  target_json: string;
  reward_points: number;
  reward_badge: string;
  difficulty: string;
  enabled: string;
  sort_order: number;
}

interface QuestsPayload {
  ok: boolean;
  data: QuestRow[];
}

export default function AdminQuestsPage() {
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<QuestRow[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetType, setTargetType] = useState("CLAIM_COUNT");
  const [targetCount, setTargetCount] = useState("1");
  const [rewardPoints, setRewardPoints] = useState("10");
  const [rewardBadge, setRewardBadge] = useState("");
  const [difficulty, setDifficulty] = useState("Core");
  const [sortOrder, setSortOrder] = useState("");
  const [enabled, setEnabled] = useState(true);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<QuestsPayload>("/api/admin/quests");
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quests");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/admin/quests", {
        method: "POST",
        json: {
          title: title.trim(),
          description: description.trim(),
          target_type: targetType,
          target_json: { count: Number(targetCount || "1") },
          reward_points: Number(rewardPoints || "0"),
          reward_badge: rewardBadge.trim(),
          difficulty: difficulty.trim(),
          enabled,
          sort_order: sortOrder ? Number(sortOrder) : undefined
        }
      });
      setMessage("Quest saved.");
      setTitle("");
      setDescription("");
      setTargetType("CLAIM_COUNT");
      setTargetCount("1");
      setRewardPoints("10");
      setRewardBadge("");
      setDifficulty("Core");
      setSortOrder("");
      setEnabled(true);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save quest");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Quest Manager" subtitle="Create personalized missions and reward logic" />

      <form className="card" onSubmit={onSave} style={{ display: "grid", gap: 10 }}>
        <div className="grid grid-2">
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Target Type
            <select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
              <option value="CLAIM_COUNT">CLAIM_COUNT</option>
              <option value="JOURNAL_COUNT">JOURNAL_COUNT</option>
              <option value="EVENT_PARTICIPATION">EVENT_PARTICIPATION</option>
              <option value="STREAK_MILESTONE">STREAK_MILESTONE</option>
            </select>
          </label>
        </div>

        <label>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="grid grid-2">
          <label>
            Required Count
            <input type="number" min={1} value={targetCount} onChange={(e) => setTargetCount(e.target.value)} required />
          </label>
          <label>
            Reward Points
            <input type="number" min={0} value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} required />
          </label>
        </div>

        <div className="grid grid-2">
          <label>
            Reward Badge (optional)
            <input value={rewardBadge} onChange={(e) => setRewardBadge(e.target.value)} placeholder="QUEST_FINISHER" />
          </label>
          <label>
            Difficulty
            <input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-2">
          <label>
            Sort Order (optional)
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 26 }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Enabled
          </label>
        </div>

        <button disabled={saving}>{saving ? "Saving..." : "Save quest"}</button>
      </form>

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh quests"}
        </button>
        {error ? <span style={{ color: "var(--danger)" }}>{error}</span> : null}
        {message ? <span className="pill">{message}</span> : null}
      </section>

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Quest</th>
              <th>Target</th>
              <th>Reward</th>
              <th>Difficulty</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.quest_id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{row.title}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.quest_id}</div>
                </td>
                <td>
                  <div>{row.target_type}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.target_json}</div>
                </td>
                <td>
                  <div>{row.reward_points || 0} points</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{row.reward_badge || "No badge"}</div>
                </td>
                <td>{row.difficulty || "Core"}</td>
                <td>{String(row.enabled || "TRUE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
