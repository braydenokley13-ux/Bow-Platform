"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface QuestRow {
  quest_id: string;
  title: string;
  description: string;
  difficulty: string;
  reward_points: number;
  reward_badge: string;
  target_type: string;
  progress: number;
  required: number;
  met: boolean;
  claimed: boolean;
}

interface QuestPayload {
  ok: boolean;
  data: QuestRow[];
}

interface ClaimPayload {
  ok: boolean;
  message: string;
  data: {
    completion_id: string;
    quest_id: string;
    awarded_points: number;
    awarded_badge: string;
  };
}

export default function StudentQuestsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<QuestRow[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<QuestPayload>("/api/me/quests");
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

  async function claimQuest(questId: string) {
    setClaimingId(questId);
    setError(null);
    setMessage(null);
    try {
      const json = await apiFetch<ClaimPayload>(`/api/me/quests/${encodeURIComponent(questId)}/claim`, {
        method: "POST"
      });
      setMessage(`${json.message} (+${json.data?.awarded_points || 0} points)`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quest claim failed");
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Quests" subtitle="Complete missions and claim reward points and badges" />

      <section className="card row-8-center-wrap">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh quests"}
        </button>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {message ? (
        <section className="card">
          <div className="banner banner-success">{message}</div>
        </section>
      ) : null}

      <section className="card stack-8">
        <h2 className="title-18">Mission Board</h2>
        {rows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quest</th>
                  <th>Difficulty</th>
                  <th>Progress</th>
                  <th>Reward</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((quest) => {
                  const progressPct = quest.required > 0 ? Math.min(100, Math.floor((quest.progress / quest.required) * 100)) : 0;
                  const claimReady = quest.met && !quest.claimed;
                  return (
                    <tr key={quest.quest_id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{quest.title}</div>
                        <div className="muted-12">{quest.description}</div>
                        <div className="muted-12">Type: {quest.target_type}</div>
                      </td>
                      <td>{quest.difficulty || "Core"}</td>
                      <td>
                        <div>
                          {quest.progress}/{quest.required}
                        </div>
                        <div className="muted-12">{progressPct}% complete</div>
                      </td>
                      <td>
                        {quest.reward_points} points
                        {quest.reward_badge ? <div style={{ fontSize: 12, color: "var(--muted)" }}>Badge: {quest.reward_badge}</div> : null}
                      </td>
                      <td>{quest.claimed ? <span className="pill">Claimed</span> : quest.met ? <span className="pill">Ready</span> : <span className="pill">In Progress</span>}</td>
                      <td>
                        <button
                          onClick={() => void claimQuest(quest.quest_id)}
                          disabled={!claimReady || claimingId === quest.quest_id}
                        >
                          {claimingId === quest.quest_id ? "Claiming..." : "Claim"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0">No quests configured yet.</p>
        )}
      </section>
    </div>
  );
}
