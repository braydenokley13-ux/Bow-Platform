"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

export default function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);
    try {
      const json = await apiFetch<{ ok: boolean; data: unknown }>("/api/admin/invites", {
        method: "POST",
        json: { email, role }
      });
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Invite Management" subtitle="Create private cohort invitations" />
      <form className="card" onSubmit={onInvite} style={{ display: "grid", gap: 10, maxWidth: 540 }}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="STUDENT">STUDENT</option>
            <option value="INSTRUCTOR">INSTRUCTOR</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <button>Create invite</button>
      </form>
      {error ? <div className="banner banner-error">{error}</div> : null}
      {!error && result ? <div className="banner banner-success">Invite created successfully.</div> : null}
      {result ? (
        <pre className="card" style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
