"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Reply {
  reply_id: string;
  author_email: string;
  author_name?: string;
  body: string;
  is_official_answer: boolean;
  posted_at: string;
}

interface Thread {
  thread_id: string;
  author_email: string;
  author_name?: string;
  title: string;
  body: string;
  module_id?: string;
  reply_count: number;
  posted_at: string;
  replies?: Reply[];
}

interface ThreadsPayload {
  ok: boolean;
  data: Thread[];
}

interface ThreadPayload {
  ok: boolean;
  data: Thread;
}

export default function DiscussionPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);

  // New thread form
  const [composing, setComposing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newModule, setNewModule] = useState("");
  const [posting, setPosting] = useState(false);

  async function loadThreads() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ThreadsPayload>("/api/discussion");
      setThreads(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load discussions");
    } finally {
      setBusy(false);
    }
  }

  async function openThread(t: Thread) {
    setSelected({ ...t, replies: [] });
    setLoadingThread(true);
    setReplyBody("");
    try {
      const res = await apiFetch<ThreadPayload>(`/api/discussion/${t.thread_id}`);
      setSelected(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load thread");
    } finally {
      setLoadingThread(false);
    }
  }

  async function postThread() {
    if (!newTitle.trim() || !newBody.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await apiFetch("/api/discussion", {
        method: "POST",
        json: { title: newTitle.trim(), body: newBody.trim(), module_id: newModule.trim() }
      });
      setNewTitle(""); setNewBody(""); setNewModule(""); setComposing(false);
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post thread");
    } finally {
      setPosting(false);
    }
  }

  async function postReply() {
    if (!selected || !replyBody.trim()) return;
    setReplying(true);
    setError(null);
    try {
      await apiFetch(`/api/discussion/${selected.thread_id}/reply`, {
        method: "POST",
        json: { body: replyBody.trim() }
      });
      setReplyBody("");
      // Reload this thread's replies
      const res = await apiFetch<ThreadPayload>(`/api/discussion/${selected.thread_id}`);
      setSelected(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setReplying(false);
    }
  }

  useEffect(() => { void loadThreads(); }, []);

  if (selected) {
    return (
      <div className="grid gap-14">
        <section className="card row-8-center">
          <button className="secondary" onClick={() => setSelected(null)}>← Back</button>
          <span className="pill">{selected.reply_count} replies</span>
        </section>

        {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}

        <section className="card stack-8">
          {selected.module_id ? <div className="kicker">Module: {selected.module_id}</div> : null}
          <h2 style={{ margin: 0 }}>{selected.title}</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>{selected.body}</p>
          <div style={{ fontSize: 13, opacity: 0.45 }}>
            {selected.author_name ?? selected.author_email} · {new Date(selected.posted_at).toLocaleDateString()}
          </div>
        </section>

        {loadingThread ? (
          <section className="card"><p className="m-0 text-muted-60">Loading replies...</p></section>
        ) : null}

        {(selected.replies ?? []).map((r) => (
          <section
            key={r.reply_id}
            className="card"
            style={{ borderLeft: r.is_official_answer ? "3px solid var(--accent, #2563eb)" : undefined }}
          >
            {r.is_official_answer ? (
              <div className="kicker" style={{ marginBottom: 6, color: "var(--accent, #2563eb)" }}>
                ✓ Official Answer
              </div>
            ) : null}
            <p style={{ margin: "0 0 8px" }}>{r.body}</p>
            <div style={{ fontSize: 13, opacity: 0.45 }}>
              {r.author_name ?? r.author_email} · {new Date(r.posted_at).toLocaleDateString()}
            </div>
          </section>
        ))}

        <section className="card stack-10">
          <label>
            Your reply
            <textarea
              rows={3}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              maxLength={2000}
              placeholder="Share your thoughts..."
              className="input-resize"
            />
          </label>
          <div>
            <button onClick={() => void postReply()} disabled={replying || !replyBody.trim()}>
              {replying ? "Posting..." : "Post Reply"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Class Discussion" subtitle="Async Q&A and discussion organized by module" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}

      <section className="card row-8">
        <button onClick={() => void loadThreads()} disabled={busy}>{busy ? "Loading..." : "Refresh"}</button>
        <button onClick={() => setComposing((v) => !v)}>
          {composing ? "Cancel" : "+ New Thread"}
        </button>
      </section>

      {composing ? (
        <section className="card stack-10">
          <h2 className="title-16">New Discussion Thread</h2>
          <label>
            Title
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={200} placeholder="Your question or topic..." />
          </label>
          <label>
            Module ID <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span>
            <input value={newModule} onChange={(e) => setNewModule(e.target.value)} placeholder="e.g. MOD_101_1" />
          </label>
          <label>
            Details
            <textarea
              rows={4}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              maxLength={2000}
              placeholder="Provide context for your question..."
              className="input-resize"
            />
          </label>
          <div>
            <button onClick={() => void postThread()} disabled={posting || !newTitle.trim() || !newBody.trim()}>
              {posting ? "Posting..." : "Post Thread"}
            </button>
          </div>
        </section>
      ) : null}

      {!busy && threads.length === 0 ? (
        <section className="card">
          <p className="m-0 text-muted-60">No threads yet. Start a discussion!</p>
        </section>
      ) : null}

      <div className="grid stack-8">
        {threads.map((t) => (
          <button
            key={t.thread_id}
            onClick={() => void openThread(t)}
            style={{ all: "unset", cursor: "pointer", display: "block" }}
          >
            <article className="card stack-4">
              <div className="row-8-center-wrap">
                {t.module_id ? <span className="pill" style={{ fontSize: 12 }}>{t.module_id}</span> : null}
                <h2 style={{ margin: 0, fontSize: 15 }}>{t.title}</h2>
              </div>
              <div style={{ fontSize: 13, opacity: 0.55 }}>
                {t.author_name ?? t.author_email} · {t.reply_count} {t.reply_count === 1 ? "reply" : "replies"} · {new Date(t.posted_at).toLocaleDateString()}
              </div>
            </article>
          </button>
        ))}
      </div>
    </div>
  );
}
