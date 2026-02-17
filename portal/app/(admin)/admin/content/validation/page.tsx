"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface ValidationIssue {
  severity: "ERROR" | "WARN";
  entity: string;
  entity_id: string;
  issue_code: string;
  details_json: string;
}

interface ValidationPayload {
  ok: boolean;
  data: {
    summary: {
      total: number;
      errors: number;
      warnings: number;
    };
    issues: ValidationIssue[];
    check_links: boolean;
  };
}

export default function AdminContentValidationPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkLinks, setCheckLinks] = useState(false);
  const [summary, setSummary] = useState<ValidationPayload["data"]["summary"] | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);

  async function load(linkChecks: boolean) {
    setBusy(true);
    setError(null);
    try {
      const query = linkChecks ? "?check_links=true" : "";
      const json = await apiFetch<ValidationPayload>(`/api/admin/content/validation${query}`);
      setSummary(json.data.summary);
      setIssues(json.data.issues || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate content");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load(false);
  }, []);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Content Validation" subtitle="Checks published curriculum integrity before student impact" />

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={checkLinks}
            onChange={(e) => setCheckLinks(e.target.checked)}
            style={{ width: 16, height: 16 }}
          />
          Check external simulation URLs
        </label>
        <button onClick={() => void load(checkLinks)} disabled={busy}>
          {busy ? "Running validation..." : "Run validation"}
        </button>
        {summary ? (
          <>
            <span className="pill">Errors: {summary.errors}</span>
            <span className="pill">Warnings: {summary.warnings}</span>
            <span className="pill">Total: {summary.total}</span>
          </>
        ) : null}
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      <section className="card table-wrap">
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Issues</h2>
        {issues.length ? (
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Entity</th>
                <th>ID</th>
                <th>Code</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, idx) => (
                <tr key={`${issue.issue_code}-${issue.entity_id}-${idx}`}>
                  <td>
                    <span className={`pill ${issue.severity === "ERROR" ? "banner-error" : ""}`}>{issue.severity}</span>
                  </td>
                  <td>{issue.entity}</td>
                  <td>{issue.entity_id || "(none)"}</td>
                  <td>{issue.issue_code}</td>
                  <td style={{ maxWidth: 540, whiteSpace: "pre-wrap" }}>{issue.details_json}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ margin: 0 }}>No validation issues found.</p>
        )}
      </section>
    </div>
  );
}
