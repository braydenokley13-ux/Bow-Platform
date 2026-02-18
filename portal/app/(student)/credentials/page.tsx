"use client";

import { useEffect, useState, useCallback } from "react";
import { PageTitle } from "@/components/page-title";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface Credential {
  credential_id: string;
  title: string;
  type?: string;
  code?: string;
  track?: string;
  issued_at: string;
  expires_at?: string;
}

interface CredentialsPayload {
  ok: boolean;
  data: { credentials: Credential[] };
}

export default function CredentialsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<CredentialsPayload>("/api/me/credentials");
      setCredentials(res.data?.credentials ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load credentials");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function copyCode(code: string, id: string) {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

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
            <section key={cred.credential_id} className="card stack-8">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <h2 className="title-16" style={{ margin: 0 }}>{cred.title}</h2>
                  {cred.type ? <span className="pill" style={{ fontSize: 11, marginTop: 4 }}>{cred.type}</span> : null}
                  {cred.track ? <span className="pill" style={{ fontSize: 11, marginTop: 4, marginLeft: 4 }}>Track {cred.track}</span> : null}
                </div>
                <span style={{ fontSize: 12, opacity: 0.45, whiteSpace: "nowrap" }}>
                  Issued {new Date(cred.issued_at).toLocaleDateString()}
                </span>
              </div>
              {cred.code ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <code
                    style={{
                      background: "var(--surface-2, #f3f4f6)",
                      padding: "4px 10px",
                      borderRadius: 4,
                      fontSize: 13,
                      letterSpacing: "0.05em",
                      fontFamily: "monospace"
                    }}
                  >
                    {cred.code}
                  </code>
                  <button
                    className="secondary"
                    style={{ fontSize: 12, padding: "4px 10px" }}
                    onClick={() => copyCode(cred.code!, cred.credential_id)}
                  >
                    {copied === cred.credential_id ? "Copied!" : "Copy"}
                  </button>
                </div>
              ) : null}
              {cred.expires_at ? (
                <p className="m-0" style={{ fontSize: 12, opacity: 0.5 }}>
                  Expires {new Date(cred.expires_at).toLocaleDateString()}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
