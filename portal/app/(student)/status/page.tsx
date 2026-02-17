"use client";

import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";

export default function StatusPage() {
  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Platform Status" subtitle="Operational status and recent issues" />
      <FetchPanel endpoint="/api/status" title="Current status" />
    </div>
  );
}
