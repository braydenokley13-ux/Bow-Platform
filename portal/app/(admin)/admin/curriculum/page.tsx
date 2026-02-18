"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageTitle } from "@/components/page-title";
import { PageSection } from "@/components/page-section";
import { ActionBar } from "@/components/action-bar";
import { StatCard } from "@/components/stat-card";
import { FeedbackBanner } from "@/components/feedback-banner";
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
    <div className="grid gap-14">
      <PageTitle
        title="Curriculum Studio"
        subtitle="Admin-managed Program -> Module -> Lesson -> Activity -> Outcome with publish safety"
      />

      <PageSection
        actions={
          <ActionBar>
            <button onClick={() => void load()} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh studio"}
            </button>
            <Link href="/admin/curriculum/programs" className="pill">Programs</Link>
            <Link href="/admin/curriculum/modules" className="pill">Modules</Link>
            <Link href="/admin/curriculum/lessons" className="pill">Lessons</Link>
            <Link href="/admin/curriculum/activities" className="pill">Activities</Link>
            <Link href="/admin/curriculum/outcomes" className="pill">Outcomes</Link>
            <Link href="/admin/curriculum/publish" className="pill">Publish Console</Link>
          </ActionBar>
        }
      >
        <p className="m-0 text-muted">Use the studio controls below to publish or roll back curriculum safely.</p>
      </PageSection>

      {error ? <FeedbackBanner kind="error">{error}</FeedbackBanner> : null}

      <div className="grid grid-2">
        <StatCard label="Draft Programs" value={counts.programs} accent="brand" />
        <StatCard label="Draft Modules" value={counts.modules} accent="info" />
        <StatCard label="Draft Lessons" value={counts.lessons} accent="success" />
        <StatCard label="Draft Activities" value={counts.activities} accent="brand" />
        <StatCard label="Draft Outcomes" value={counts.outcomes} accent="info" />
      </div>

      <PageSection title="Publish Controls">
        <div className="stack-10">
          <label className="field">
            <span>Publish Notes</span>
            <input value={publishNotes} onChange={(e) => setPublishNotes(e.target.value)} />
          </label>

          <ActionBar>
            {confirmPublish ? (
              <>
                <span className="pill">Confirm publish to students?</span>
                <button
                  onClick={() => {
                    void publishNow();
                    setConfirmPublish(false);
                  }}
                >
                  Yes, Publish Draft {"->"} Student
                </button>
                <button className="secondary" onClick={() => setConfirmPublish(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmPublish(true)}>Publish Draft {"->"} Student</button>
            )}
          </ActionBar>

          <label className="field">
            <span>Rollback Target Batch ID (optional)</span>
            <input
              value={rollbackBatchId}
              onChange={(e) => setRollbackBatchId(e.target.value)}
              placeholder="Leave blank to auto-select previous batch"
            />
          </label>
          <ActionBar>
            <button className="secondary" onClick={() => void rollbackNow()}>
              Rollback Published Curriculum
            </button>
          </ActionBar>
        </div>
      </PageSection>

      <PageSection title="Reorder Draft Entity">
        <div className="grid grid-2">
          <label className="field">
            <span>Entity</span>
            <select value={reorderEntity} onChange={(e) => setReorderEntity(e.target.value)}>
              <option value="programs">Programs</option>
              <option value="modules">Modules</option>
              <option value="lessons">Lessons</option>
              <option value="activities">Activities</option>
              <option value="outcomes">Outcomes</option>
            </select>
          </label>
          <label className="field">
            <span>Ordered IDs (comma separated)</span>
            <input
              value={reorderIds}
              onChange={(e) => setReorderIds(e.target.value)}
              placeholder="MOD_101_1, MOD_101_2, MOD_101_3"
            />
          </label>
        </div>
        <ActionBar>
          <button onClick={() => void saveReorder()}>Save Draft Order</button>
        </ActionBar>
      </PageSection>

      {statusMsg ? <FeedbackBanner>{statusMsg}</FeedbackBanner> : null}

      <PageSection title="Published Snapshot">
        <div className="grid grid-2">
          <div className="pill">Programs: {published?.programs.length || 0}</div>
          <div className="pill">Modules: {published?.modules.length || 0}</div>
          <div className="pill">Lessons: {published?.lessons.length || 0}</div>
          <div className="pill">Activities: {published?.activities.length || 0}</div>
          <div className="pill">Outcomes: {published?.outcomes.length || 0}</div>
        </div>
      </PageSection>
    </div>
  );
}
