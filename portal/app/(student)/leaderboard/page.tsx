"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { DataTable } from "@/components/data-table";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { apiFetch } from "@/lib/client-api";

interface LeaderboardEntry {
  rank: number;
  student_id?: string;
  name: string;
  display_name?: string;
  xp: number;
  badges?: number;
  streak?: number;
}

interface LeaderboardPayload {
  ok: boolean;
  data: {
    entries?: LeaderboardEntry[];
    leaderboard?: LeaderboardEntry[];
    rows?: LeaderboardEntry[];
    me?: { rank: number; xp: number };
  };
}

function rankClass(rank: number) {
  if (rank === 1) return "rank-badge gold";
  if (rank === 2) return "rank-badge silver";
  if (rank === 3) return "rank-badge bronze";
  return "rank-badge";
}

function normalise(p: LeaderboardPayload): LeaderboardEntry[] {
  const d = p.data;
  return (d.entries ?? d.leaderboard ?? d.rows ?? []).map((e, i) => ({
    ...e,
    rank: e.rank ?? i + 1,
    name: e.display_name ?? e.name ?? "—",
  }));
}

export default function LeaderboardPage() {
  const [track, setTrack]     = useState("all");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe]           = useState<{ rank: number; xp: number } | null>(null);

  async function load(t: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<LeaderboardPayload>(`/api/leaderboard?track=${t}`);
      setEntries(normalise(res));
      setMe(res.data.me ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(track); }, [track]);

  const showBadges = entries.length > 0 && entries[0].badges != null;
  const showStreak = entries.length > 0 && entries[0].streak != null;

  return (
    <div className="grid gap-5">
      <PageTitle
        title="Leaderboard"
        subtitle="Overall and track-specific XP standings"
      />

      <div className="filter-bar">
        <div className="field" style={{ margin: 0 }}>
          <span>Track</span>
          <select
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            disabled={busy}
            style={{ width: "auto" }}
          >
            <option value="all">All Tracks</option>
            <option value="101">Track 101</option>
            <option value="201">Track 201</option>
            <option value="301">Track 301</option>
          </select>
        </div>
        {entries.length > 0 && (
          <span className="pill">{entries.length} students</span>
        )}
      </div>

      {me && (
        <div className="card flex items-center gap-3" style={{ padding: "14px 20px" }}>
          <div className={rankClass(me.rank)}>{me.rank}</div>
          <div>
            <p className="fw-bold m-0">Your rank</p>
            <p className="text-muted text-sm m-0">{me.xp.toLocaleString()} XP</p>
          </div>
        </div>
      )}

      {error && <div className="banner banner-error">{error}</div>}

      {busy && (
        <section className="card">
          <LoadingSkeleton lines={8} />
        </section>
      )}

      {!busy && entries.length === 0 && !error && (
        <div className="empty-state">
          <h3>No rankings yet</h3>
          <p>Earn XP by completing activities, attending events, and submitting assignments.</p>
        </div>
      )}

      {!busy && entries.length > 0 && (
        <div className="table-wrap">
          <DataTable
            headers={[
              "Rank", "Student", "XP",
              ...(showBadges ? ["Badges"] : []),
              ...(showStreak ? ["Streak"] : []),
            ]}
            stickyHeader
          >
            {entries.map((e) => (
              <tr key={e.student_id ?? e.rank}>
                <td><div className={rankClass(e.rank)}>{e.rank}</div></td>
                <td className="fw-semi">{e.name}</td>
                <td><span className="xp-badge">{e.xp.toLocaleString()} XP</span></td>
                {showBadges && <td>{e.badges ?? 0}</td>}
                {showStreak && <td>{e.streak ?? 0} day{e.streak !== 1 ? "s" : ""}</td>}
              </tr>
            ))}
          </DataTable>
        </div>
      )}
    </div>
  );
}
