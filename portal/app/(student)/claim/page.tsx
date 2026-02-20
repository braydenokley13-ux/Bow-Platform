"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface ClaimResult {
  ok: boolean;
  data: {
    earnedXP: number;
    totalXP: number;
    level: number;
    levelTitle?: string;
    streak?: number;
    track?: string;
    module?: string;
    lesson?: string | number;
    deltaReason?: string;
  };
}

export default function ClaimPage() {
  const [code, setCode] = useState("");
  const [track, setTrack] = useState("101");
  const [moduleId, setModuleId] = useState("");
  const [lesson, setLesson] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ClaimResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const json = await apiFetch<ClaimResult>("/api/me/claims/submit", {
        method: "POST",
        json: {
          code,
          track,
          module: moduleId || undefined,
          lesson: lesson || undefined
        }
      });
      setResult(json.data);
      setCode("");
      setModuleId("");
      setLesson("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Claim Center" subtitle="Submit lesson claim codes to earn XP" />
      <form className="card stack-10 max-w-640" onSubmit={(e) => void onSubmit(e)}>
        <label>
          Claim Code
          <input value={code} onChange={(e) => setCode(e.target.value)} required />
        </label>
        <div className="grid grid-2">
          <label>
            Track
            <select value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="101">101</option>
              <option value="201">201</option>
              <option value="301">301</option>
            </select>
          </label>
          <label>
            Module (optional)
            <input value={moduleId} onChange={(e) => setModuleId(e.target.value)} placeholder="1, 2, GAUNTLET" />
          </label>
        </div>
        <label>
          Lesson (optional)
          <input value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="1" />
        </label>
        <button disabled={busy}>{busy ? "Submitting..." : "Submit claim"}</button>
      </form>

      {error ? <FeedbackBanner kind="error">{error}</FeedbackBanner> : null}

      {result ? (
        <section className="card stack-10">
          <FeedbackBanner kind="success">
            Claim accepted — you earned <strong>+{result.earnedXP} XP</strong>!
          </FeedbackBanner>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "grid", gap: 2 }}>
                <span style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>XP Earned</span>
                <span style={{ fontWeight: 700, fontSize: 20, color: "var(--success, #16a34a)" }}>+{result.earnedXP}</span>
              </div>
              <div style={{ display: "grid", gap: 2 }}>
                <span style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total XP</span>
                <span style={{ fontWeight: 700, fontSize: 20 }}>{result.totalXP.toLocaleString()}</span>
              </div>
              <div style={{ display: "grid", gap: 2 }}>
                <span style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Level</span>
                <span style={{ fontWeight: 700, fontSize: 20 }}>
                  {result.level}{result.levelTitle ? ` · ${result.levelTitle}` : ""}
                </span>
              </div>
              {result.streak != null ? (
                <div style={{ display: "grid", gap: 2 }}>
                  <span style={{ fontSize: 11, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>Streak</span>
                  <span style={{ fontWeight: 700, fontSize: 20 }}>{result.streak}d</span>
                </div>
              ) : null}
            </div>
            {result.deltaReason ? (
              <p className="m-0" style={{ fontSize: 12, opacity: 0.5 }}>Note: {result.deltaReason}</p>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
