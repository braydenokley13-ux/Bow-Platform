"use client";

import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";

export default function CredentialsPage() {
  return (
    <div className="grid gap-14">
      <PageTitle title="Credentials" subtitle="Issued passes and verification IDs" />
      <FetchPanel endpoint="/api/me/credentials" title="Credential records" />
    </div>
  );
}
