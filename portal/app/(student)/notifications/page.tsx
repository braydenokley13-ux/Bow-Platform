"use client";

import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";

export default function NotificationsPage() {
  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Notifications" subtitle="In-portal event history" />
      <FetchPanel endpoint="/api/notifications?limit=100" title="Notification inbox" />
    </div>
  );
}
