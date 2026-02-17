"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface CurriculumLesson {
  lesson_id: string;
  title: string;
  order?: number;
  completed?: boolean;
}

interface CurriculumModule {
  module_id: string;
  title: string;
  order?: number;
  lessons?: CurriculumLesson[];
}

interface CurriculumProgram {
  program_id: string;
  title: string;
  order?: number;
  modules?: CurriculumModule[];
}

interface CurriculumPayload {
  ok: boolean;
  data: {
    programs: CurriculumProgram[];
    modules: CurriculumModule[];
    lessons: CurriculumLesson[];
  };
}

function pct(completed: number, total: number) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

export default function StudentRoadmapPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<CurriculumPayload>("/api/me/curriculum");
      const data = res.data;

      // index modules and lessons by parent so we can build the tree
      const modulesByProgram: Record<string, CurriculumModule[]> = {};
      const lessonsByModule: Record<string, CurriculumLesson[]> = {};

      for (const m of data.modules ?? []) {
        const pid = (m as unknown as Record<string, unknown>)["program_id"] as string | undefined;
        if (pid) {
          modulesByProgram[pid] = modulesByProgram[pid] ?? [];
          modulesByProgram[pid].push(m);
        }
      }
      for (const l of data.lessons ?? []) {
        const mid = (l as unknown as Record<string, unknown>)["module_id"] as string | undefined;
        if (mid) {
          lessonsByModule[mid] = lessonsByModule[mid] ?? [];
          lessonsByModule[mid].push(l);
        }
      }

      const built = (data.programs ?? []).map((p) => ({
        ...p,
        modules: (modulesByProgram[p.program_id] ?? []).map((m) => ({
          ...m,
          lessons: lessonsByModule[m.module_id] ?? []
        }))
      }));

      setPrograms(built);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load curriculum");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle
        title="Curriculum Roadmap"
        subtitle="Your path through BOW Sports Capital — programs, modules, and lessons"
      />

      <section className="card" style={{ display: "flex", gap: 8 }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Loading..." : "Refresh"}
        </button>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {busy && programs.length === 0 ? (
        <section className="card">
          <p style={{ margin: 0, opacity: 0.6 }}>Loading roadmap...</p>
        </section>
      ) : programs.length === 0 ? (
        <section className="card">
          <p style={{ margin: 0, opacity: 0.6 }}>No curriculum published yet.</p>
        </section>
      ) : null}

      {programs.map((program) => {
        const totalLessons = (program.modules ?? []).reduce(
          (sum, m) => sum + (m.lessons?.length ?? 0),
          0
        );
        const completedLessons = (program.modules ?? []).reduce(
          (sum, m) => sum + (m.lessons?.filter((l) => l.completed).length ?? 0),
          0
        );

        return (
          <section key={program.program_id} className="card" style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{program.title}</h2>
              <span className="pill">
                {completedLessons}/{totalLessons} lessons — {pct(completedLessons, totalLessons)}%
              </span>
            </div>

            {/* progress bar */}
            <div style={{ height: 6, background: "var(--bg2, #e5e7eb)", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct(completedLessons, totalLessons)}%`,
                  height: "100%",
                  background: "var(--accent, #2563eb)",
                  borderRadius: 3,
                  transition: "width 0.3s"
                }}
              />
            </div>

            {(program.modules ?? []).map((mod) => {
              const modTotal = mod.lessons?.length ?? 0;
              const modDone = mod.lessons?.filter((l) => l.completed).length ?? 0;

              return (
                <div
                  key={mod.module_id}
                  style={{ paddingLeft: 16, borderLeft: "2px solid var(--border, #e5e7eb)", display: "grid", gap: 6 }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 15 }}>{mod.title}</strong>
                    <span className="pill" style={{ fontSize: 12 }}>
                      {modDone}/{modTotal}
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 4 }}>
                    {(mod.lessons ?? []).map((lesson) => (
                      <div
                        key={lesson.lesson_id}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          paddingLeft: 12,
                          opacity: lesson.completed ? 1 : 0.65
                        }}
                      >
                        <span style={{ fontSize: 14 }}>
                          {lesson.completed ? "✓" : "○"}
                        </span>
                        <span style={{ fontSize: 14 }}>{lesson.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
