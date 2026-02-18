"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface OnboardingStatus {
  ok: boolean;
  data: {
    dismissed: boolean;
    steps: Record<string, boolean>;
  };
}

const STEPS: Array<{ id: string; label: string; description: string; auto?: boolean }> = [
  {
    id: "display_name",
    label: "Set your display name",
    description: "Head to your Profile page and set a name your classmates will recognise.",
    auto: true
  },
  {
    id: "pod",
    label: "Check your pod assignment",
    description: "Visit the Pods page to see which pod you're in and who your teammates are.",
    auto: true
  },
  {
    id: "goal",
    label: "Submit your first season goal",
    description: "Go to the Goal page and write one concrete thing you want to achieve this season.",
    auto: true
  },
  {
    id: "leaderboard_rules",
    label: "Read the leaderboard rules",
    description: "Understand how XP is earned and how the seasonal ranking works."
  },
  {
    id: "bookmark",
    label: "Bookmark this portal",
    description: "Save it in your browser so you can find it quickly before each session."
  }
];

export default function ChecklistPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<OnboardingStatus>("/api/me/onboarding");
      setSteps(res.data.steps ?? {});
      setDismissed(res.data.dismissed ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load checklist");
    } finally {
      setBusy(false);
    }
  }

  async function markStep(id: string, done: boolean) {
    setSaving(id);
    try {
      const res = await apiFetch<OnboardingStatus>("/api/me/onboarding", {
        method: "POST",
        json: { step: id, done }
      });
      setSteps(res.data.steps ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update step");
    } finally {
      setSaving(null);
    }
  }

  async function dismiss() {
    setSaving("dismiss");
    try {
      await apiFetch("/api/me/onboarding", {
        method: "POST",
        json: { step: "all", dismissed: true }
      });
      setDismissed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss checklist");
    } finally {
      setSaving(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const completed = STEPS.filter((s) => steps[s.id]).length;
  const allDone = completed === STEPS.length;

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Getting Started"
        subtitle="Complete these steps to get the most out of the BOW Sports Capital portal"
      />

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {(allDone || dismissed) && !error ? (
        <section className="card">
          <div className="banner">
            {allDone
              ? "All steps complete — you're fully set up. Great work!"
              : "Checklist dismissed. You can always come back here if you need a refresher."}
          </div>
        </section>
      ) : null}

      <section className="card" style={{ display: "grid", gap: 4 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <strong>{completed}/{STEPS.length} complete</strong>
          <div style={{ flex: 1, height: 6, background: "var(--bg2, #e5e7eb)", borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                width: `${(completed / STEPS.length) * 100}%`,
                height: "100%",
                background: "var(--accent, #2563eb)",
                borderRadius: 3,
                transition: "width 0.3s"
              }}
            />
          </div>
        </div>

        {STEPS.map((step) => {
          const done = steps[step.id] ?? false;
          const isSaving = saving === step.id;
          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "10px 0",
                borderBottom: "1px solid var(--border, #e5e7eb)",
                opacity: done ? 0.6 : 1
              }}
            >
              <button
                className="secondary"
                onClick={() => void markStep(step.id, !done)}
                disabled={isSaving || !!step.auto}
                style={{ flexShrink: 0, padding: "2px 8px", fontSize: 16, minWidth: 32 }}
                title={step.auto ? "Auto-tracked based on your activity" : done ? "Mark incomplete" : "Mark complete"}
              >
                {done ? "✓" : "○"}
              </button>
              <div>
                <div style={{ fontWeight: 600 }}>{step.label}</div>
                <div style={{ fontSize: 13, opacity: 0.65, marginTop: 2 }}>{step.description}</div>
                {step.auto ? (
                  <div style={{ fontSize: 12, opacity: 0.45, marginTop: 2 }}>Auto-tracked</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>

      {!dismissed ? (
        <section className="card">
          <button
            className="secondary"
            onClick={() => void dismiss()}
            disabled={saving === "dismiss"}
          >
            {saving === "dismiss" ? "Dismissing..." : "Dismiss checklist"}
          </button>
        </section>
      ) : null}

      {busy ? (
        <section className="card">
          <p style={{ margin: 0, opacity: 0.6 }}>Loading...</p>
        </section>
      ) : null}
    </div>
  );
}
