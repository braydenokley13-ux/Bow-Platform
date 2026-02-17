"use client";

import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";

export default function HistoryPage() {
  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="My Activity History" subtitle="Claims, raffle entries, and notification events" />
      <FetchPanel endpoint="/api/activity-history" title="Activity timeline" />
    </div>
  );
}
