"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClassRecord {
  /** First name only – privacy-masked by the API */
  holder: string;
  value: number;
  /** ISO date string or descriptive label */
  achieved_at?: string;
}

interface PersonalBest {
  value: number;
  achieved_at?: string;
}

interface RecordsPayload {
  ok: boolean;
  data: {
    class_records: {
      highest_weekly_xp: ClassRecord;
      longest_checkin_streak: ClassRecord;
      most_shoutouts: ClassRecord;
      fastest_submission_hours: ClassRecord;
    };
    personal_bests: {
      highest_weekly_xp: PersonalBest;
      longest_checkin_streak: PersonalBest;
      most_shoutouts: PersonalBest;
      fastest_submission_hours: PersonalBest;
    };
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(raw?: string): string {
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function formatValue(key: RecordKey, value: number): string {
  if (key === "fastest_submission_hours") {
    if (value < 1) {
      const mins = Math.round(value * 60);
      return `${mins} min`;
    }
    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (key === "highest_weekly_xp") return `${value.toLocaleString()} XP`;
  if (key === "longest_checkin_streak") return `${value} day${value === 1 ? "" : "s"}`;
  if (key === "most_shoutouts") return `${value} kudos`;
  return String(value);
}

// ── Record category metadata ──────────────────────────────────────────────────

type RecordKey =
  | "highest_weekly_xp"
  | "longest_checkin_streak"
  | "most_shoutouts"
  | "fastest_submission_hours";

interface CategoryMeta {
  key: RecordKey;
  icon: string;
  title: string;
  description: string;
  accentColor: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: "highest_weekly_xp",
    icon: "⚡",
    title: "Highest Single-Week XP",
    description: "Most XP earned in any one calendar week",
    accentColor: "#1e4fb4",
  },
  {
    key: "longest_checkin_streak",
    icon: "🔥",
    title: "Longest Check-In Streak",
    description: "Most consecutive days with a daily check-in",
    accentColor: "#c45c00",
  },
  {
    key: "most_shoutouts",
    icon: "📣",
    title: "Most Shoutouts Received",
    description: "All-time kudos received from instructors and peers",
    accentColor: "#0d7a4f",
  },
  {
    key: "fastest_submission_hours",
    icon: "🏎️",
    title: "Fastest Assignment Submission",
    description: "Shortest time between assignment opening and submission",
    accentColor: "#7b3fa0",
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

interface ClassRecordCardProps {
  meta: CategoryMeta;
  record: ClassRecord | undefined;
}

function ClassRecordCard({ meta, record }: ClassRecordCardProps) {
  const hasData = record && record.value != null;
  return (
    <article
      className="card"
      style={{
        display: "grid",
        gap: 10,
        borderTop: `3px solid ${meta.accentColor}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative icon watermark */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 8,
          right: 12,
          fontSize: 40,
          opacity: 0.08,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {meta.icon}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 22,
            lineHeight: 1,
            background: "var(--surface-soft)",
            borderRadius: 8,
            padding: "4px 6px",
            border: "1px solid var(--border)",
          }}
        >
          {meta.icon}
        </span>
        <div className="kicker" style={{ color: meta.accentColor }}>
          Class Record
        </div>
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
          {meta.title}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 12 }}>
          {meta.description}
        </div>
      </div>

      {hasData ? (
        <>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: meta.accentColor,
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
            }}
          >
            {formatValue(meta.key, record.value)}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span className="pill" style={{ borderColor: meta.accentColor + "44" }}>
              {record.holder}
            </span>
            {record.achieved_at ? (
              <span
                style={{ fontSize: 12, color: "var(--muted)" }}
              >
                {formatDate(record.achieved_at)}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: 14 }}>No record set yet</div>
      )}
    </article>
  );
}

interface PersonalBestCardProps {
  meta: CategoryMeta;
  best: PersonalBest | undefined;
  classRecord: ClassRecord | undefined;
}

function PersonalBestCard({ meta, best, classRecord }: PersonalBestCardProps) {
  const hasData = best && best.value != null;

  const isClassRecord =
    hasData &&
    classRecord != null &&
    classRecord.value != null &&
    (meta.key === "fastest_submission_hours"
      ? best.value <= classRecord.value
      : best.value >= classRecord.value);

  return (
    <article
      className="card"
      style={{
        display: "grid",
        gap: 10,
        background: isClassRecord
          ? "linear-gradient(135deg, var(--surface) 60%, #fffbea)"
          : "var(--surface)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isClassRecord ? (
        <span
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            fontSize: 11,
            fontWeight: 700,
            background: "#f5c400",
            color: "#6b4c00",
            borderRadius: 6,
            padding: "2px 7px",
            letterSpacing: "0.04em",
          }}
        >
          CLASS RECORD
        </span>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            fontSize: 20,
            lineHeight: 1,
            background: "var(--surface-soft)",
            borderRadius: 8,
            padding: "4px 6px",
            border: "1px solid var(--border)",
          }}
        >
          {meta.icon}
        </span>
        <div className="kicker">{meta.title}</div>
      </div>

      {hasData ? (
        <>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: isClassRecord ? "#b58a00" : "var(--text)",
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
            }}
          >
            {formatValue(meta.key, best.value)}
          </div>
          {best.achieved_at ? (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {formatDate(best.achieved_at)}
            </div>
          ) : null}
        </>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: 14 }}>Nothing recorded yet</div>
      )}
    </article>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function RecordSkeleton() {
  return (
    <article className="card" style={{ display: "grid", gap: 10 }}>
      <div className="skeleton sk-line" style={{ width: "30%" }} />
      <div className="skeleton sk-title" style={{ width: "70%" }} />
      <div className="skeleton sk-line" style={{ width: "50%" }} />
      <div className="skeleton sk-line" style={{ width: "40%" }} />
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RecordsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<RecordsPayload | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<RecordsPayload>("/api/records");
      setPayload(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const classRecords = payload?.data.class_records;
  const personalBests = payload?.data.personal_bests;

  return (
    <div className="grid" style={{ gap: 20 }}>
      <PageTitle
        title="Session Records Wall"
        subtitle="All-time class records and your personal bests across every category"
      />

      {/* Refresh bar */}
      <section
        className="card"
        style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
      >
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : "Refresh records"}
        </button>
        {busy ? <span className="pill">Fetching latest data...</span> : null}
      </section>

      {/* Error banner */}
      {error ? (
        <section className="card">
          <div className="banner banner-error">
            <strong>Could not load records:</strong> {error}
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={() => void load()} className="secondary">
              Retry
            </button>
          </div>
        </section>
      ) : null}

      {/* ── Class Records ─────────────────────────────────────────────────── */}
      <section className="card" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Class Records</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            All-time highs across the entire cohort
          </span>
        </div>

        {busy && !payload ? (
          <div className="grid grid-2" style={{ gap: 12 }}>
            {CATEGORIES.map((c) => (
              <RecordSkeleton key={c.key} />
            ))}
          </div>
        ) : (
          <div className="grid grid-2" style={{ gap: 12 }}>
            {CATEGORIES.map((meta) => (
              <ClassRecordCard
                key={meta.key}
                meta={meta}
                record={classRecords?.[meta.key]}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Personal Bests ────────────────────────────────────────────────── */}
      <section className="card" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Your Personal Bests</h2>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            Your highest scores in each category
          </span>
        </div>

        {busy && !payload ? (
          <div className="grid grid-2" style={{ gap: 12 }}>
            {CATEGORIES.map((c) => (
              <RecordSkeleton key={c.key} />
            ))}
          </div>
        ) : (
          <div className="grid grid-2" style={{ gap: 12 }}>
            {CATEGORIES.map((meta) => (
              <PersonalBestCard
                key={meta.key}
                meta={meta}
                best={personalBests?.[meta.key]}
                classRecord={classRecords?.[meta.key]}
              />
            ))}
          </div>
        )}

        {/* Footnote */}
        {payload ? (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--muted)",
              borderTop: "1px solid var(--border)",
              paddingTop: 10,
            }}
          >
            Records marked{" "}
            <strong style={{ color: "#b58a00" }}>CLASS RECORD</strong> mean your
            personal best ties or beats the cohort record.
          </p>
        ) : null}
      </section>
    </div>
  );
}
