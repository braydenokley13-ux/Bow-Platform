"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface DraftCounts {
  programs: number;
  modules: number;
  lessons: number;
  activities: number;
  outcomes: number;
}

interface PublishedCurriculum {
  programs: unknown[];
  modules: unknown[];
  lessons: unknown[];
  activities: unknown[];
  outcomes: unknown[];
}

export default function AdminCurriculumHomePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<DraftCounts>({
    programs: 0,
    modules: 0,
    lessons: 0,
    activities: 0,
    outcomes: 0
  });
  const [published, setPublished] = useState<PublishedCurriculum | null>(null);

  const [publishNotes, setPublishNotes] = useState("Publish from Curriculum Studio");
  const [rollbackBatchId, setRollbackBatchId] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);

  const [reorderEntity, setReorderEntity] = useState("modules");
  const [reorderIds, setReorderIds] = useState("");
  const [statusMsg, setStatusMsg] = useState<string>("");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const [p, m, l, a, o, pub] = await Promise.all([
        apiFetch<Envelope<unknown[]>>("/api/admin/curriculum/draft/programs"),
        apiFetch<Envelope<unknown[]>>("/api/admin/curriculum/draft/modules"),
        apiFetch<Envelope<unknown[]>>("/api/admin/curriculum/draft/lessons"),
        apiFetch<Envelope<unknown[]>>("/api/admin/curriculum/draft/activities"),
        apiFetch<Envelope<unknown[]>>("/api/admin/curriculum/draft/outcomes"),
        apiFetch<Envelope<PublishedCurriculum>>("/api/me/curriculum")
      ]);

      setCounts({
        programs: p.data.length,
        modules: m.data.length,
        lessons: l.data.length,
        activities: a.data.length,
        outcomes: o.data.length
      });
      setPublished(pub.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load curriculum studio state");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function publishNow() {
    setStatusMsg("");
    try {
      await apiFetch("/api/admin/curriculum/publish", {
        method: "POST",
        json: { notes: publishNotes }
      });
      setStatusMsg("Publish completed.");
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Publish failed");
    }
  }

  async function rollbackNow() {
    setStatusMsg("");
    try {
      await apiFetch("/api/admin/curriculum/rollback", {
        method: "POST",
        json: { publish_batch_id: rollbackBatchId || undefined }
      });
      setStatusMsg("Rollback completed.");
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Rollback failed");
    }
  }

  async function saveReorder() {
    setStatusMsg("");
    const ordered = reorderIds
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    if (!ordered.length) {
      setStatusMsg("Add at least one ID in the reorder list.");
      return;
    }

    try {
      await apiFetch("/api/admin/curriculum/draft/reorder", {
        method: "POST",
        json: {
          entity: reorderEntity,
          ordered_ids: ordered
        }
      });
      setStatusMsg("Draft reorder saved.");
      await load();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Reorder failed");
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Curriculum Studio"
        subtitle="Admin-managed Program -> Module -> Lesson -> Activity -> Outcome with publish safety"
      />

      <section className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh studio"}
        </button>
        <Link href="/admin/curriculum/programs" className="pill">
          Programs
        </Link>
        <Link href="/admin/curriculum/modules" className="pill">
          Modules
        </Link>
        <Link href="/admin/curriculum/lessons" className="pill">
          Lessons
        </Link>
        <Link href="/admin/curriculum/activities" className="pill">
          Activities
        </Link>
        <Link href="/admin/curriculum/outcomes" className="pill">
          Outcomes
        </Link>
        <Link href="/admin/curriculum/publish" className="pill">
          Publish Console
        </Link>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="grid grid-2">
        <article className="card">
          <div className="kicker">Draft Programs</div>
          <h2 style={{ margin: "6px 0" }}>{counts.programs}</h2>
        </article>
        <article className="card">
          <div className="kicker">Draft Modules</div>
          <h2 style={{ margin: "6px 0" }}>{counts.modules}</h2>
        </article>
        <article className="card">
          <div className="kicker">Draft Lessons</div>
          <h2 style={{ margin: "6px 0" }}>{counts.lessons}</h2>
        </article>
        <article className="card">
          <div className="kicker">Draft Activities</div>
          <h2 style={{ margin: "6px 0" }}>{counts.activities}</h2>
        </article>
        <article className="card">
          <div className="kicker">Draft Outcomes</div>
          <h2 style={{ margin: "6px 0" }}>{counts.outcomes}</h2>
        </article>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Publish Controls</h2>
        <label>
          Publish Notes
          <input value={publishNotes} onChange={(e) => setPublishNotes(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {confirmPublish ? (
            <>
              <span className="pill">Confirm publish to students?</span>
              <button onClick={() => { void publishNow(); setConfirmPublish(false); }}>
                Yes, Publish Draft {"->"} Student
              </button>
              <button className="secondary" onClick={() => setConfirmPublish(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmPublish(true)}>
              Publish Draft {"->"} Student
            </button>
          )}
        </div>

        <label>
          Rollback Target Batch ID (optional)
          <input
            value={rollbackBatchId}
            onChange={(e) => setRollbackBatchId(e.target.value)}
            placeholder="Leave blank to auto-select previous batch"
          />
        </label>
        <div>
          <button className="secondary" onClick={() => void rollbackNow()}>
            Rollback Published Curriculum
          </button>
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Reorder Draft Entity</h2>
        <div className="grid grid-2">
          <label>
            Entity
            <select value={reorderEntity} onChange={(e) => setReorderEntity(e.target.value)}>
              <option value="programs">Programs</option>
              <option value="modules">Modules</option>
              <option value="lessons">Lessons</option>
              <option value="activities">Activities</option>
              <option value="outcomes">Outcomes</option>
            </select>
          </label>
          <label>
            Ordered IDs (comma separated)
            <input
              value={reorderIds}
              onChange={(e) => setReorderIds(e.target.value)}
              placeholder="MOD_101_1, MOD_101_2, MOD_101_3"
            />
          </label>
        </div>
        <div>
          <button onClick={() => void saveReorder()}>Save Draft Order</button>
        </div>
      </section>

      {statusMsg ? (
        <section className="card">
          <div className="banner">{statusMsg}</div>
        </section>
      ) : null}

      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Published Snapshot</h2>
        <div className="grid grid-2">
          <div className="pill">Programs: {published?.programs.length || 0}</div>
          <div className="pill">Modules: {published?.modules.length || 0}</div>
          <div className="pill">Lessons: {published?.lessons.length || 0}</div>
          <div className="pill">Activities: {published?.activities.length || 0}</div>
          <div className="pill">Outcomes: {published?.outcomes.length || 0}</div>
        </div>
      </section>
    </div>
  );
}
