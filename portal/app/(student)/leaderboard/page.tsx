"use client";

import { useEffect, useState, useCallback } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface LeaderboardRow {
  rank: number;
  display_name: string;
  total_xp: number;
  level: number;
  streak?: number;
}

interface LeaderboardPayload {
  ok: boolean;
  data: LeaderboardRow[];
}

export default function LeaderboardPage() {
  const [track, setTrack] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  const load = useCallback(async (selectedTrack: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<LeaderboardPayload>(`/api/leaderboard?track=${selectedTrack}`);
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(track);
  }, [load, track]);

  return (
    <div className="grid gap-14">
      <PageTitle title="Leaderboard" subtitle="Overall and track-specific standings" />

      <section className="card stack-10" style={{ maxWidth: 400 }}>
        <label>
          Track
          <select value={track} onChange={(e) => setTrack(e.target.value)}>
            <option value="all">All tracks</option>
            <option value="101">101</option>
            <option value="201">201</option>
            <option value="301">301</option>
          </select>
        </label>
      </section>

      {error ? <FeedbackBanner kind="error">{error}</FeedbackBanner> : null}

      {busy ? (
        <LoadingSkeleton lines={6} />
      ) : rows.length === 0 ? (
        <EmptyState title="No rankings yet" body="Leaderboard data will appear once students earn XP." />
      ) : (
        <section className="card" style={{ padding: 0 }}>
          <DataTable headers={["Rank", "Name", "Level", "XP", "Streak"]} stickyHeader>
            {rows.map((row) => (
              <tr key={row.rank}>
                <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                  {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`}
                </td>
                <td>
                  <span style={{ fontWeight: 600 }}>{row.display_name}</span>
                </td>
                <td>
                  <span className="pill">Lv {row.level}</span>
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{row.total_xp.toLocaleString()} XP</td>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>
                  {row.streak != null ? `${row.streak}d` : "—"}
                </td>
              </tr>
            ))}
          </DataTable>
        </section>
      )}
    </div>
  );
}
