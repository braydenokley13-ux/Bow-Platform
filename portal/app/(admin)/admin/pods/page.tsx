"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface PodRow {
  pod_id: string;
  name: string;
  season_id: string;
  status: string;
  member_count: number;
  points: number;
  members: Array<{ email: string; display_name: string }>;
}

interface PodsPayload {
  ok: boolean;
  data: PodRow[];
}

export default function AdminPodsPage() {
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState<PodRow[]>([]);

  const [seasonId, setSeasonId] = useState("");
  const [podSize, setPodSize] = useState("4");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const endpoint = seasonId ? `/api/admin/pods?season_id=${encodeURIComponent(seasonId)}` : "/api/admin/pods";
      const json = await apiFetch<PodsPayload>(endpoint);
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pods");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onAssign(e: FormEvent) {
    e.preventDefault();
    setAssigning(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/admin/pods/assign", {
        method: "POST",
        json: {
          season_id: seasonId || undefined,
          pod_size: Number(podSize || "4")
        }
      });
      setMessage("Pods assigned successfully.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign pods");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Pod Manager" subtitle="Assign students into pods and monitor pod standings" />

      <form className="card" onSubmit={onAssign} style={{ display: "grid", gap: 10 }}>
        <div className="grid grid-2">
          <label>
            Season ID (blank = active)
            <input value={seasonId} onChange={(e) => setSeasonId(e.target.value)} placeholder="SEA_..." />
          </label>
          <label>
            Target Pod Size (2-8)
            <input
              type="number"
              min={2}
              max={8}
              value={podSize}
              onChange={(e) => setPodSize(e.target.value)}
              required
            />
          </label>
        </div>
        <button disabled={assigning}>{assigning ? "Assigning..." : "Assign Pods"}</button>
      </form>

      <section className="card row-8-center-wrap">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh pods"}
        </button>
        {error ? <span style={{ color: "var(--danger)" }}>{error}</span> : null}
        {message ? <span className="pill">{message}</span> : null}
      </section>

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pod</th>
              <th>Status</th>
              <th>Points</th>
              <th>Members</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.pod_id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{row.name}</div>
                  <div className="muted-12">{row.pod_id}</div>
                </td>
                <td>{row.status}</td>
                <td>{row.points || 0}</td>
                <td>
                  <div>{row.member_count || 0} members</div>
                  <div className="muted-12">
                    {(row.members || []).map((m) => m.display_name || m.email).join(", ") || "-"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
