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
}

const CATEGORIES: CategoryMeta[] = [
  {
    key: "highest_weekly_xp",
    icon: "⚡",
    title: "Highest Single-Week XP",
    description: "Most XP earned in any one calendar week",
  },
  {
    key: "longest_checkin_streak",
    icon: "🔥",
    title: "Longest Check-In Streak",
    description: "Most consecutive days with a daily check-in",
  },
  {
    key: "most_shoutouts",
    icon: "📣",
    title: "Most Shoutouts Received",
    description: "All-time kudos received from instructors and peers",
  },
  {
    key: "fastest_submission_hours",
    icon: "🏎️",
    title: "Fastest Assignment Submission",
    description: "Shortest time between assignment opening and submission",
  },
];

const RECORD_ACCENT_CLASS: Record<RecordKey, string> = {
  highest_weekly_xp: "records-accent-blue",
  longest_checkin_streak: "records-accent-orange",
  most_shoutouts: "records-accent-green",
  fastest_submission_hours: "records-accent-purple",
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface ClassRecordCardProps {
  meta: CategoryMeta;
  record: ClassRecord | undefined;
}

function ClassRecordCard({ meta, record }: ClassRecordCardProps) {
  const hasData = record && record.value != null;
  return (
    <article
      className={`card records-card ${RECORD_ACCENT_CLASS[meta.key]}`}
    >
      {/* Decorative icon watermark */}
      <span aria-hidden className="records-watermark">
        {meta.icon}
      </span>

      <div className="row-8-center">
        <span className="records-icon-chip records-icon-chip-lg">
          {meta.icon}
        </span>
        <div className="kicker records-accent-text">
          Class Record
        </div>
      </div>

      <div>
        <div className="records-title">{meta.title}</div>
        <div className="muted-12">{meta.description}</div>
      </div>

      {hasData ? (
        <>
          <div className="records-value records-accent-text">
            {formatValue(meta.key, record.value)}
          </div>
          <div className="row-8-center-wrap">
            <span className="pill records-accent-pill">
              {record.holder}
            </span>
            {record.achieved_at ? (
              <span className="muted-12">
                {formatDate(record.achieved_at)}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <div className="text-muted">No record set yet</div>
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
      className={`card records-card ${RECORD_ACCENT_CLASS[meta.key]}${isClassRecord ? " records-best-highlight" : ""}`}
    >
      {isClassRecord ? (
        <span className="records-class-tag">
          CLASS RECORD
        </span>
      ) : null}

      <div className="row-8-center">
        <span className="records-icon-chip">
          {meta.icon}
        </span>
        <div className="kicker">{meta.title}</div>
      </div>

      {hasData ? (
        <>
          <div className={`records-value-lg${isClassRecord ? " records-value-gold" : ""}`}>
            {formatValue(meta.key, best.value)}
          </div>
          {best.achieved_at ? (
            <div className="muted-12">
              {formatDate(best.achieved_at)}
            </div>
          ) : null}
        </>
      ) : (
        <div className="text-muted">Nothing recorded yet</div>
      )}
    </article>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function RecordSkeleton() {
  return (
    <article className="card stack-10">
      <div className="skeleton sk-line w-30" />
      <div className="skeleton sk-title w-70" />
      <div className="skeleton sk-line w-50" />
      <div className="skeleton sk-line w-40" />
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
    <div className="grid gap-20">
      <PageTitle
        title="Session Records Wall"
        subtitle="All-time class records and your personal bests across every category"
      />

      {/* Refresh bar */}
      <section
        className="card row-8-center-wrap"
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
          <div className="mt-10">
            <button onClick={() => void load()} className="secondary">
              Retry
            </button>
          </div>
        </section>
      ) : null}

      {/* ── Class Records ─────────────────────────────────────────────────── */}
      <section className="card stack-14">
        <div className="row-10-baseline">
          <h2 className="m-0 title-20">Class Records</h2>
          <span className="muted-13">
            All-time highs across the entire cohort
          </span>
        </div>

        {busy && !payload ? (
          <div className="grid grid-2 gap-12">
            {CATEGORIES.map((c) => (
              <RecordSkeleton key={c.key} />
            ))}
          </div>
        ) : (
          <div className="grid grid-2 gap-12">
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
      <section className="card stack-14">
        <div className="row-10-baseline">
          <h2 className="m-0 title-20">Your Personal Bests</h2>
          <span className="muted-13">
            Your highest scores in each category
          </span>
        </div>

        {busy && !payload ? (
          <div className="grid grid-2 gap-12">
            {CATEGORIES.map((c) => (
              <RecordSkeleton key={c.key} />
            ))}
          </div>
        ) : (
          <div className="grid grid-2 gap-12">
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
          <p className="records-footnote">
            Records marked{" "}
            <strong className="records-value-gold">CLASS RECORD</strong> mean your
            personal best ties or beats the cohort record.
          </p>
        ) : null}
      </section>
    </div>
  );
}
