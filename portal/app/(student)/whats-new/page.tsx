"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ChangelogEntry {
  entry_id: string;
  title: string;
  body: string;
  category: "feature" | "fix" | "improvement" | "note";
  published_at: string;
}

interface ChangelogPayload {
  ok: boolean;
  data: ChangelogEntry[];
}

const CATEGORY_LABEL: Record<ChangelogEntry["category"], string> = {
  feature: "New Feature",
  fix: "Bug Fix",
  improvement: "Improvement",
  note: "Note"
};

export default function WhatsNewPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<ChangelogPayload>("/api/changelog");
      setEntries(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load changelog");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid gap-14">
      <PageTitle
        title="What's New"
        subtitle="Recent updates and improvements to the BOW Sports Capital portal"
      />

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {!busy && entries.length === 0 ? (
        <section className="card">
          <p className="m-0 text-muted-60">No updates posted yet. Check back soon.</p>
        </section>
      ) : null}

      <div className="grid stack-10">
        {entries.map((entry) => (
          <article key={entry.entry_id} className="card stack-8">
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="pill">{CATEGORY_LABEL[entry.category] ?? entry.category}</span>
              <span style={{ opacity: 0.45, fontSize: 13 }}>
                {new Date(entry.published_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: 16 }}>{entry.title}</h2>
            <p className="m-0 text-muted-75" style={{ whiteSpace: "pre-wrap" }}>{entry.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
