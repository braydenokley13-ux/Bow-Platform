"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface HotTake {
  take_id: string;
  author_email: string;
  author_name?: string;
  take: string;
  agree_count: number;
  disagree_count: number;
  my_vote?: "agree" | "disagree" | null;
  posted_at: string;
}

interface HotTakesPayload {
  ok: boolean;
  data: HotTake[];
}

function VoteBar({ agree, disagree }: { agree: number; disagree: number }) {
  const total = agree + disagree;
  const agreePct = total === 0 ? 50 : Math.round((agree / total) * 100);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent, #2563eb)", minWidth: 36 }}>
        {agreePct}%
      </span>
      <div style={{ flex: 1, height: 8, background: "var(--bg2, #e5e7eb)", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            width: `${agreePct}%`,
            height: "100%",
            background: "var(--accent, #2563eb)",
            borderRadius: 4,
            transition: "width 0.4s"
          }}
        />
      </div>
      <span style={{ fontSize: 13, opacity: 0.5 }}>{total} vote{total !== 1 ? "s" : ""}</span>
    </div>
  );
}

export default function HotTakesPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [takes, setTakes] = useState<HotTake[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<HotTakesPayload>("/api/hot-takes");
      // Sort by total votes descending
      const sorted = (res.data ?? []).sort(
        (a, b) => (b.agree_count + b.disagree_count) - (a.agree_count + a.disagree_count)
      );
      setTakes(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hot takes");
    } finally {
      setBusy(false);
    }
  }

  async function post() {
    if (!draft.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await apiFetch("/api/hot-takes", { method: "POST", json: { take: draft.trim() } });
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post take");
    } finally {
      setPosting(false);
    }
  }

  async function vote(takeId: string, v: "agree" | "disagree") {
    setVoting(takeId);
    try {
      await apiFetch(`/api/hot-takes/${takeId}/vote`, { method: "POST", json: { vote: v } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setVoting(null);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Hot Takes" subtitle="Post a bold sports opinion — the class votes Agree or Disagree" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <label>
          Your hot take <span style={{ opacity: 0.5, fontWeight: 400 }}>(max 280 chars)</span>
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={280}
            placeholder="e.g. The franchise tag is ruining player mobility in the NFL."
            style={{ width: "100%", resize: "vertical" }}
          />
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => void post()} disabled={posting || !draft.trim()}>
            {posting ? "Posting..." : "Post Take"}
          </button>
          <span style={{ fontSize: 12, opacity: 0.45 }}>{draft.length}/280</span>
        </div>
      </section>

      {!busy && takes.length === 0 ? (
        <section className="card">
          <p style={{ margin: 0, opacity: 0.6 }}>No hot takes yet. Start the debate!</p>
        </section>
      ) : null}

      <div className="grid" style={{ gap: 10 }}>
        {takes.map((t) => (
          <article key={t.take_id} className="card" style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{t.take}</p>

            <VoteBar agree={t.agree_count} disagree={t.disagree_count} />

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => void vote(t.take_id, "agree")}
                disabled={voting === t.take_id || t.my_vote === "agree"}
                style={{
                  background: t.my_vote === "agree" ? "var(--accent, #2563eb)" : undefined,
                  color: t.my_vote === "agree" ? "#fff" : undefined
                }}
              >
                👍 Agree ({t.agree_count})
              </button>
              <button
                className="secondary"
                onClick={() => void vote(t.take_id, "disagree")}
                disabled={voting === t.take_id || t.my_vote === "disagree"}
                style={{
                  background: t.my_vote === "disagree" ? "#ef4444" : undefined,
                  color: t.my_vote === "disagree" ? "#fff" : undefined
                }}
              >
                👎 Disagree ({t.disagree_count})
              </button>
              <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.4 }}>
                {t.author_name ?? t.author_email} · {new Date(t.posted_at).toLocaleDateString()}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
