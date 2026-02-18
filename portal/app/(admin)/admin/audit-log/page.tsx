"use client";

import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";

export default function AdminAuditLogPage() {
  return (
    <div className="grid gap-14">
      <PageTitle title="Audit Log" subtitle="Operational log and admin action trail" />
      <FetchPanel endpoint="/api/admin/audit-log?limit=300" title="Recent audit events" />
    </div>
  );
}
