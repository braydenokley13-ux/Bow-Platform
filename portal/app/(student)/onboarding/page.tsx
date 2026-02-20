"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageTitle } from "@/components/page-title";

const STORAGE_KEY = "bow_onboarding_v1";

interface Step {
  id: string;
  text: string;
  linkText?: string;
  href?: string;
}

const STEPS: Step[] = [
  { id: "activate", text: "Activate your account and confirm login works." },
  { id: "activities", text: "Open", linkText: "Activities", href: "/activities", },
  { id: "claim", text: "Submit your first code in", linkText: "Claim Center", href: "/claim" },
  { id: "dashboard", text: "Check XP and level on", linkText: "Dashboard", href: "/dashboard" },
  { id: "calendar", text: "Review events in", linkText: "Calendar", href: "/calendar" },
  { id: "chat", text: "Join class discussion in", linkText: "Chat", href: "/chat" },
  { id: "raffles", text: "Review raffle ticket balance in", linkText: "Raffles", href: "/raffles" }
];

// Suffix text after the link for steps that need it
const STEP_SUFFIX: Record<string, string> = {
  activities: " and pick your first lesson.",
  claim: ".",
  dashboard: ".",
  calendar: ".",
  chat: ".",
  raffles: "."
};

function loadSaved(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveDone(done: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
  } catch {
    // storage unavailable
  }
}

export default function OnboardingPage() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDone(loadSaved());
    setMounted(true);
  }, []);

  function toggle(id: string) {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveDone(next);
      return next;
    });
  }

  function reset() {
    saveDone({});
    setDone({});
  }

  const completedCount = STEPS.filter((s) => done[s.id]).length;
  const allDone = completedCount === STEPS.length;

  return (
    <div className="grid gap-14">
      <PageTitle title="Onboarding Checklist" subtitle="Complete these steps to get fully set up" />

      <section className="card stack-10">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
            {mounted ? completedCount : 0} / {STEPS.length} complete
          </span>
          <div
            style={{
              height: 6,
              flex: 1,
              background: "var(--border, #e5e7eb)",
              borderRadius: 99,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                height: "100%",
                width: mounted ? `${(completedCount / STEPS.length) * 100}%` : "0%",
                background: allDone ? "var(--success, #16a34a)" : "var(--accent, #3b82f6)",
                borderRadius: 99,
                transition: "width 0.3s ease"
              }}
            />
          </div>
          {mounted && completedCount > 0 ? (
            <button
              type="button"
              className="secondary"
              style={{ fontSize: 12, padding: "4px 10px", whiteSpace: "nowrap" }}
              onClick={reset}
            >
              Reset
            </button>
          ) : null}
        </div>

        {allDone && mounted ? (
          <div className="banner banner-success">
            You are fully set up! Welcome to BOW Sports Capital.
          </div>
        ) : null}
      </section>

      <section className="card" style={{ display: "grid", gap: 0, padding: 0 }}>
        {STEPS.map((step, idx) => {
          const isChecked = mounted && !!done[step.id];
          return (
            <label
              key={step.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 18px",
                borderBottom: idx < STEPS.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none",
                cursor: "pointer",
                opacity: isChecked ? 0.55 : 1,
                transition: "opacity 0.2s"
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(step.id)}
                style={{ width: 18, height: 18, flexShrink: 0, cursor: "pointer" }}
              />
              <span
                style={{
                  fontSize: 15,
                  flex: 1,
                  textDecoration: isChecked ? "line-through" : "none"
                }}
              >
                {step.text}{" "}
                {step.href && step.linkText ? (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  <Link href={step.href as any} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 600 }}>
                    {step.linkText}
                  </Link>
                ) : null}
                {step.id in STEP_SUFFIX ? STEP_SUFFIX[step.id] : ""}
              </span>
              {isChecked ? (
                <span style={{ color: "var(--success, #16a34a)", fontSize: 18, flexShrink: 0 }}>✓</span>
              ) : (
                <span style={{ width: 18, flexShrink: 0 }} />
              )}
            </label>
          );
        })}
      </section>
    </div>
  );
}
