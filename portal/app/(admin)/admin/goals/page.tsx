"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface StudentGoal {
  email: string;
  display_name?: string;
  pod?: string;
  goal: string;
  updated_at?: string;
}

interface GoalsPayload {
  ok: boolean;
  data: StudentGoal[];
}

export default function AdminGoalsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [query, setQuery] = useState("");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<GoalsPayload>("/api/admin/goals");
      setGoals(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const q = query.toLowerCase();
  const filtered = goals.filter(
    (g) =>
      !q ||
      g.email.toLowerCase().includes(q) ||
      (g.display_name ?? "").toLowerCase().includes(q) ||
      (g.pod ?? "").toLowerCase().includes(q) ||
      g.goal.toLowerCase().includes(q)
  );

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Student Season Goals"
        subtitle="Goals set by each student for the current season"
      />

      <section className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>
        <input
          placeholder="Search by name, email, pod, or goal text..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <span className="pill">{filtered.length} students</span>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {filtered.length === 0 && !busy ? (
        <section className="card">
          <p style={{ margin: 0, opacity: 0.6 }}>
            {query ? "No goals match your search." : "No students have set goals yet."}
          </p>
        </section>
      ) : null}

      <div className="grid" style={{ gap: 10 }}>
        {filtered.map((g) => (
          <article key={g.email} className="card" style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{g.display_name ?? g.email}</strong>
              {g.pod ? <span className="pill">{g.pod}</span> : null}
              <span style={{ opacity: 0.5, fontSize: 13 }}>{g.email}</span>
              {g.updated_at ? (
                <span style={{ marginLeft: "auto", opacity: 0.4, fontSize: 12 }}>
                  {new Date(g.updated_at).toLocaleDateString()}
                </span>
              ) : null}
            </div>
            <p style={{ margin: 0, fontSize: 15 }}>{g.goal}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
