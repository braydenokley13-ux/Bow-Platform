"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Student {
  email: string;
  display_name: string;
}

interface SpotlightData {
  display_name: string;
  email: string;
  level: number;
  level_title: string;
  xp: number;
  streak_days: number;
  top_badge: { name: string; icon: string } | null;
  best_stat_label: string;
  best_stat_value: string;
  quote: string;
  quote_source: string;
  generated_at: string;
}

interface StudentsPayload {
  ok: boolean;
  data: { students: Student[] };
}

interface SpotlightPayload {
  ok: boolean;
  data: SpotlightData;
}

function SpotlightCard({ s }: { s: SpotlightData }) {
  return (
    <div
      id="spotlight-card"
      style={{
        background: "linear-gradient(135deg, #0d7a4f 0%, #1e4fb4 100%)",
        borderRadius: 16,
        padding: "28px 28px 24px",
        color: "#fff",
        maxWidth: 480,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        fontFamily: "system-ui, sans-serif",
        display: "grid",
        gap: 18,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, fontWeight: 800, color: "#fff",
          border: "2px solid rgba(255,255,255,0.4)",
          flexShrink: 0,
        }}>
          {s.display_name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1 }}>{s.display_name}</div>
          <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>
            Level {s.level} · {s.level_title}
          </div>
        </div>
        {s.top_badge && (
          <div style={{ marginLeft: "auto", fontSize: 28, lineHeight: 1 }} title={s.top_badge.name}>
            {s.top_badge.icon}
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: "Total XP", value: s.xp.toLocaleString() },
          { label: "Streak", value: `${s.streak_days}d` },
          { label: s.best_stat_label, value: s.best_stat_value },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.15)",
              borderRadius: 10,
              padding: "10px 12px",
              backdropFilter: "blur(8px)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quote */}
      {s.quote && (
        <div style={{
          background: "rgba(255,255,255,0.12)",
          borderRadius: 10,
          padding: "12px 14px",
          borderLeft: "3px solid rgba(255,255,255,0.5)",
        }}>
          <div style={{ fontSize: 14, fontStyle: "italic", lineHeight: 1.5, opacity: 0.95 }}>
            &ldquo;{s.quote}&rdquo;
          </div>
          {s.quote_source && (
            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6 }}>— {s.quote_source}</div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6, fontSize: 11 }}>
        <span>BOW Sports Capital</span>
        <span>Student Spotlight</span>
      </div>
    </div>
  );
}

export default function AdminSpotlightPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedEmail, setSelectedEmail] = useState("");
  const [spotlight, setSpotlight] = useState<SpotlightData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  async function loadStudents() {
    setLoadingStudents(true);
    try {
      const json = await apiFetch<StudentsPayload>("/api/admin/students");
      setStudents(json.data?.students ?? []);
    } catch {
      // fail silently — user can type email manually
    } finally {
      setLoadingStudents(false);
    }
  }

  async function generate() {
    if (!selectedEmail.trim()) return;
    setGenerating(true);
    setGenError(null);
    setSpotlight(null);
    try {
      const json = await apiFetch<SpotlightPayload>("/api/admin/spotlight", {
        method: "POST",
        body: JSON.stringify({ student_email: selectedEmail.trim() }),
      });
      setSpotlight(json.data);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => { void loadStudents(); }, []);

  return (
    <div className="grid" style={{ gap: 20 }}>
      <PageTitle
        title="Student Spotlight Generator"
        subtitle="Generate a shareable highlight card for any student. Screenshot it for Zoom or the class feed."
      />

      {/* Select Student */}
      <section className="card" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Select a Student</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {students.length > 0 ? (
            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              style={{ flex: "1 1 260px", minWidth: 200 }}
            >
              <option value="">— Choose a student —</option>
              {students.map((s) => (
                <option key={s.email} value={s.email}>
                  {s.display_name} ({s.email})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="email"
              placeholder={loadingStudents ? "Loading students…" : "Enter student email"}
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              style={{ flex: "1 1 260px" }}
            />
          )}
          <button
            onClick={() => void generate()}
            disabled={generating || !selectedEmail.trim()}
            style={{ whiteSpace: "nowrap" }}
          >
            {generating ? "Generating…" : "Generate Spotlight"}
          </button>
        </div>
        {genError && <div className="banner banner-error"><strong>Error:</strong> {genError}</div>}
      </section>

      {/* Spotlight Card */}
      {spotlight && (
        <section className="card" style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Spotlight Card</h2>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>
              Screenshot this card to share in Zoom or the class feed
            </span>
          </div>

          <SpotlightCard s={spotlight} />

          <div className="banner" style={{ marginTop: 4, fontSize: 13 }}>
            <strong>Tip:</strong> Right-click the card and &ldquo;Save image as&rdquo;, or take a screenshot of the card area to share. Generated at{" "}
            {new Date(spotlight.generated_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}.
          </div>

          <button
            onClick={() => void generate()}
            disabled={generating}
            className="secondary"
            style={{ width: "fit-content" }}
          >
            {generating ? "Regenerating…" : "Regenerate Card"}
          </button>
        </section>
      )}
    </div>
  );
}
