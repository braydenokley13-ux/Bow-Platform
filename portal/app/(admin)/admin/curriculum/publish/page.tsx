"use client";

import { useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";
import { apiFetch } from "@/lib/client-api";

export default function CurriculumPublishPage() {
  const [notes, setNotes] = useState("Publish from admin console");
  const [rollbackBatchId, setRollbackBatchId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function runPublish() {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch("/api/admin/curriculum/publish", {
        method: "POST",
        json: {
          notes
        }
      });
      setMessage("Publish completed successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function runRollback() {
    setBusy(true);
    setMessage("");
    try {
      await apiFetch("/api/admin/curriculum/rollback", {
        method: "POST",
        json: {
          publish_batch_id: rollbackBatchId || undefined
        }
      });
      setMessage("Rollback completed successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Rollback failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Publish Console" subtitle="Publish Draft curriculum atomically and rollback safely" />

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Publish</h2>
        <label>
          Publish Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div>
          <button onClick={() => void runPublish()} disabled={busy}>
            {busy ? "Working..." : "Publish Draft Now"}
          </button>
        </div>
      </section>

      <section className="card" style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Rollback</h2>
        <label>
          Target Publish Batch ID (optional)
          <input
            value={rollbackBatchId}
            onChange={(e) => setRollbackBatchId(e.target.value)}
            placeholder="Leave blank to rollback to previous batch"
          />
        </label>
        <div>
          <button className="secondary" onClick={() => void runRollback()} disabled={busy}>
            {busy ? "Working..." : "Rollback Published Curriculum"}
          </button>
        </div>
      </section>

      {message ? (
        <section className="card">
          <div className="banner">{message}</div>
        </section>
      ) : null}

      <FetchPanel endpoint="/api/me/curriculum" title="Current Published Curriculum" />
      <FetchPanel endpoint="/api/admin/audit-log" title="Audit Log (publish/rollback events)" />
    </div>
  );
}
