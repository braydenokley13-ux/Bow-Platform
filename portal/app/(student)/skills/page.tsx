"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";
import { RadarChart } from "@/components/radar-chart";

interface SkillsPayload {
  ok: boolean;
  data: {
    finance: number;
    negotiation: number;
    analytics: number;
    strategy: number;
    leadership: number;
    last_updated?: string;
  };
}

const DIMENSIONS = [
  { key: "finance", label: "Finance" },
  { key: "negotiation", label: "Negotiation" },
  { key: "analytics", label: "Analytics" },
  { key: "strategy", label: "Strategy" },
  { key: "leadership", label: "Leadership" }
] as const;

export default function SkillsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skills, setSkills] = useState<SkillsPayload["data"] | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<SkillsPayload>("/api/me/skills");
      setSkills(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const dimensions = skills
    ? DIMENSIONS.map((d) => ({
        label: d.label,
        value: skills[d.key] ?? 0
      }))
    : DIMENSIONS.map((d) => ({ label: d.label, value: 0 }));

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Skill Profile"
        subtitle="Your relative strength across the 5 BOW Sports Capital competency areas"
      />

      <section className="card" style={{ display: "flex", gap: 8 }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {busy && !skills ? (
          <p style={{ margin: 0, opacity: 0.6 }}>Loading skill data...</p>
        ) : (
          <RadarChart dimensions={dimensions} size={320} />
        )}

        {skills?.last_updated ? (
          <div style={{ fontSize: 13, opacity: 0.5 }}>
            Last scored {new Date(skills.last_updated).toLocaleDateString()}
          </div>
        ) : null}
      </section>

      <section className="grid grid-2">
        {dimensions.map((d) => (
          <article key={d.label} className="card" style={{ padding: 12 }}>
            <div className="kicker">{d.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: "var(--bg2, #e5e7eb)",
                  borderRadius: 4,
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    width: `${d.value}%`,
                    height: "100%",
                    background: "var(--accent, #2563eb)",
                    borderRadius: 4,
                    transition: "width 0.4s"
                  }}
                />
              </div>
              <span style={{ fontWeight: 700, minWidth: 36, textAlign: "right" }}>
                {d.value}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="card" style={{ fontSize: 13, opacity: 0.6 }}>
        Scores are set by your instructor based on assignment performance, scenario decisions, and participation across modules.
      </section>
    </div>
  );
}
