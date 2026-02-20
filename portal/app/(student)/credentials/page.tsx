"use client";

import { useEffect, useState, useCallback } from "react";
import { PageTitle } from "@/components/page-title";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface Credential {
  pass_id: string;
  display_name: string;
  track?: string;
  level?: number | string;
  issued_at: string;
  status?: string;
  source?: string;
}

interface CredentialsPayload {
  ok: boolean;
  data: Credential[];
}

export default function CredentialsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<CredentialsPayload>("/api/me/credentials");
      setCredentials(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load credentials");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="grid gap-14">
      <PageTitle title="Credentials" subtitle="Issued passes and verification IDs" />

      {error ? <FeedbackBanner kind="error">{error}</FeedbackBanner> : null}

      {busy ? (
        <LoadingSkeleton lines={4} />
      ) : credentials.length === 0 ? (
        <EmptyState
          title="No credentials yet"
          body="Credentials will appear here once you complete qualifying activities."
        />
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {credentials.map((cred) => (
            <section key={cred.pass_id} className="card stack-8">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <h2 className="title-16" style={{ margin: 0 }}>{cred.display_name}</h2>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    {cred.track ? <span className="pill" style={{ fontSize: 11 }}>Track {cred.track}</span> : null}
                    {cred.level != null ? <span className="pill" style={{ fontSize: 11 }}>Level {cred.level}</span> : null}
                    {cred.status ? (
                      <span className="pill" style={{
                        fontSize: 11,
                        color: cred.status === "ACTIVE" ? "var(--success, #16a34a)" : "var(--muted, #6b7280)"
                      }}>
                        {cred.status}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span style={{ fontSize: 12, opacity: 0.45, whiteSpace: "nowrap" }}>
                  Issued {new Date(cred.issued_at).toLocaleDateString()}
                </span>
              </div>
              {cred.source ? (
                <p className="m-0" style={{ fontSize: 12, opacity: 0.5 }}>Source: {cred.source}</p>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
