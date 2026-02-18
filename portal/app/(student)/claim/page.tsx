"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

export default function ClaimPage() {
  const [code, setCode] = useState("");
  const [track, setTrack] = useState("101");
  const [moduleId, setModuleId] = useState("");
  const [lesson, setLesson] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const json = await apiFetch("/api/me/claims/submit", {
        method: "POST",
        json: {
          code,
          track,
          module: moduleId || undefined,
          lesson: lesson || undefined
        }
      });
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Claim Center" subtitle="Submit lesson claim codes to earn XP" />
      <form className="card stack-10 max-w-640" onSubmit={onSubmit}>
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
      {error ? <div className="banner banner-error">{error}</div> : null}
      {result ? (
        <pre className="card pre-wrap-13">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
