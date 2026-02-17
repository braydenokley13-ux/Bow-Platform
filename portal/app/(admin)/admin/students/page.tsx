"use client";

import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";

export default function AdminStudentsPage() {
  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Student Roster" subtitle="Role, status, XP, and raffle ticket visibility" />
      <FetchPanel endpoint="/api/admin/students" title="Student roster" />
    </div>
  );
}
