"use client";

import Link from "next/link";
import { PageTitle } from "@/components/page-title";

const ANALYTICS_CARDS = [
  {
    href: "/admin/analytics/mastery",
    title: "Mastery Heatmap",
    description: "Per-student, per-outcome completion grid across all modules."
  },
  {
    href: "/admin/analytics/at-risk",
    title: "At-Risk Students",
    description: "Students with low engagement, missed assignments, or stalled progress."
  },
  {
    href: "/admin/analytics/decision-trends",
    title: "Decision Trends",
    description: "Aggregate patterns in student scenario choices across sessions."
  },
  {
    href: "/admin/analytics/cohort-trends",
    title: "Cohort Trends",
    description: "Week-over-week XP, completion rates, and engagement across the class."
  }
] as const;

export default function AdminAnalyticsHubPage() {
  return (
    <div className="grid gap-14">
      <PageTitle
        title="Analytics Hub"
        subtitle="Select a report to explore class performance and engagement"
      />

      <section className="grid grid-2">
        {ANALYTICS_CARDS.map((card) => (
          <Link key={card.href} href={card.href} style={{ textDecoration: "none" }}>
            <article className="card" style={{ cursor: "pointer", height: "100%" }}>
              <div className="kicker">Analytics</div>
              <h2 style={{ margin: "6px 0 8px", fontSize: 18 }}>{card.title}</h2>
              <p style={{ margin: 0, opacity: 0.75, fontSize: 14 }}>{card.description}</p>
            </article>
          </Link>
        ))}
      </section>
    </div>
  );
}
