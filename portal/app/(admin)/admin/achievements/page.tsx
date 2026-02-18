"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface AchievementRun {
  run_id: string;
  achievement_type: string;
  awards_given: number;
  dry_run: boolean;
  run_at: string;
  students_checked: number;
}

interface RunsPayload {
  ok: boolean;
  data: AchievementRun[];
}

interface Season {
  season_id: string;
  title: string;
  status: string;
  starts_at?: string;
  ends_at?: string;
}

interface SeasonsPayload {
  ok: boolean;
  data: Season[];
}

export default function AdminAchievementsPage() {
  const [runs, setRuns] = useState<AchievementRun[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [busyRuns, setBusyRuns] = useState(false);
  const [busySeasons, setBusySeasons] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [dryRun, setDryRun] = useState(false);

  async function loadRuns() {
    setBusyRuns(true);
    try {
      const res = await apiFetch<RunsPayload>("/api/admin/achievements");
      setRuns(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setBusyRuns(false);
    }
  }

  async function loadSeasons() {
    setBusySeasons(true);
    try {
      const res = await apiFetch<SeasonsPayload>("/api/admin/seasons");
      setSeasons(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seasons");
    } finally {
      setBusySeasons(false);
    }
  }

  async function runCheck(type: "comeback" | "all") {
    setRunning(true);
    setStatusMsg("");
    setError(null);
    try {
      const res = await apiFetch<{ ok: boolean; data: { awards_given: number; students_checked: number } }>(
        "/api/admin/achievements",
        { method: "POST", json: { achievement_type: type, dry_run: dryRun } }
      );
      setStatusMsg(
        `${dryRun ? "[DRY RUN] " : ""}Check complete — ${res.data.awards_given} award${res.data.awards_given !== 1 ? "s" : ""} given across ${res.data.students_checked} students.`
      );
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  async function closeSeason(id: string, title: string) {
    if (!confirm(`Close season "${title}"? This archives top-3 standings permanently and awards trophies. Cannot be undone.`)) return;
    setClosingId(id);
    setStatusMsg("");
    setError(null);
    try {
      await apiFetch(`/api/admin/seasons/${id}/close`, { method: "POST" });
      setStatusMsg(`Season "${title}" closed — top-3 trophies awarded.`);
      await loadSeasons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close season");
    } finally {
      setClosingId(null);
    }
  }

  useEffect(() => { void loadRuns(); void loadSeasons(); }, []);

  const activeSeasons = seasons.filter((s) => s.status === "ACTIVE");

  return (
    <div className="grid gap-14">
      <PageTitle title="Achievements" subtitle="Trigger achievement checks and close seasons to award trophies" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}
      {statusMsg ? <section className="card"><div className="banner">{statusMsg}</div></section> : null}

      <section className="card stack-12">
        <h2 className="title-16">🔥 Comeback Achievement</h2>
        <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>
          Auto-awards the Comeback badge to students who were in the bottom third of the leaderboard and climbed to the top half within the past 7 days.
        </p>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          Dry run (simulate without awarding)
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => void runCheck("comeback")} disabled={running}>
            {running ? "Running..." : "Run Comeback Check"}
          </button>
          <button className="secondary" onClick={() => void runCheck("all")} disabled={running}>
            Run All Achievement Checks
          </button>
        </div>
      </section>

      <section className="card stack-12">
        <h2 className="title-16">🏆 Close Season &amp; Award Trophies</h2>
        <p style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>
          Closing a season archives the final top-3 standings permanently. Those students earn a trophy on their profiles and in their Trophy Case.
        </p>
        {busySeasons ? <p style={{ margin: 0, opacity: 0.5 }}>Loading seasons...</p> : null}
        {!busySeasons && activeSeasons.length === 0 ? (
          <p style={{ margin: 0, opacity: 0.5 }}>No active seasons found.</p>
        ) : null}
        {activeSeasons.map((s) => (
          <div key={s.season_id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "10px 14px", background: "var(--bg2, #f9fafb)", borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{s.title}</div>
              {s.ends_at ? (
                <div style={{ fontSize: 12, opacity: 0.5 }}>Ends {new Date(s.ends_at).toLocaleDateString()}</div>
              ) : null}
            </div>
            <button
              style={{ marginLeft: "auto", background: "#d97706", color: "#fff", border: "none" }}
              onClick={() => void closeSeason(s.season_id, s.title)}
              disabled={closingId === s.season_id}
            >
              {closingId === s.season_id ? "Closing..." : "Close Season"}
            </button>
          </div>
        ))}
      </section>

      <section className="card stack-10">
        <div className="row-8-center">
          <h2 className="title-16">Run History</h2>
          <button className="secondary ml-auto" onClick={() => void loadRuns()} disabled={busyRuns}>
            {busyRuns ? "Loading..." : "Refresh"}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Students checked</th>
                <th>Awards given</th>
                <th>Mode</th>
                <th>Run at</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && !busyRuns ? (
                <tr><td colSpan={5} style={{ textAlign: "center", opacity: 0.5 }}>No runs yet.</td></tr>
              ) : null}
              {runs.map((r) => (
                <tr key={r.run_id}>
                  <td>{r.achievement_type}</td>
                  <td>{r.students_checked}</td>
                  <td>{r.awards_given}</td>
                  <td>{r.dry_run ? "Dry run" : "Live"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(r.run_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
