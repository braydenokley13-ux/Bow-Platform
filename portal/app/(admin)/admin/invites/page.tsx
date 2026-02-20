"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface InviteResult {
  invite_id?: string;
  invite_link?: string;
  invite_code?: string;
  email?: string;
  role?: string;
  expires_at?: string;
  [key: string]: unknown;
}

export default function AdminInvitesPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [result, setResult] = useState<InviteResult | null>(null);
  const [lastEmail, setLastEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setResult(null);
    setError(null);
    try {
      const json = await apiFetch<{ ok: boolean; data: InviteResult }>("/api/admin/invites", {
        method: "POST",
        json: { email, role }
      });
      setLastEmail(email);
      setResult(json.data ?? {});
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Invite Management" subtitle="Create private cohort invitations" />
      <form className="card stack-10 max-w-540" onSubmit={(e) => void onInvite(e)}>
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

      {error ? <FeedbackBanner kind="error">{error}</FeedbackBanner> : null}

      {result ? (
        <section className="card stack-8">
          <FeedbackBanner kind="success">
            Invite created for <strong>{result.email ?? lastEmail}</strong>
            {result.role ? ` as ${result.role}` : ""}.
          </FeedbackBanner>
          {(result.invite_link ?? result.invite_code) ? (
            <div>
              <p className="m-0" style={{ fontSize: 13, marginBottom: 6 }}>
                Share this link with the invitee:
              </p>
              <code
                style={{
                  display: "block",
                  background: "var(--surface-2, #f3f4f6)",
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  wordBreak: "break-all"
                }}
              >
                {result.invite_link ?? result.invite_code}
              </code>
            </div>
          ) : null}
          {result.expires_at ? (
            <p className="m-0" style={{ fontSize: 12, opacity: 0.5 }}>
              Expires {new Date(result.expires_at).toLocaleString()}
            </p>
          ) : null}
          {result.invite_id ? (
            <p className="m-0" style={{ fontSize: 12, opacity: 0.45 }}>
              Invite ID: {result.invite_id}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
