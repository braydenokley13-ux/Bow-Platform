"use client";

import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";

export default function CalendarPage() {
  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Calendar" subtitle="Class events and meeting links" />
      <FetchPanel endpoint="/api/calendar" title="Events" />
    </div>
  );
}
