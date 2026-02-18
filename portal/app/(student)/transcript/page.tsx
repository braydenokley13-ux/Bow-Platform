"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Envelope<T> {
  ok: boolean;
  data: T;
}

interface TranscriptRow {
  transcript_id: string;
  email: string;
  program_id: string;
  generated_at: string;
  summary_json: string;
  pdf_file_id: string;
  verify_status: string;
  version: number;
}

interface VerifyPayload {
  transcript_id: string;
  email: string;
  generated_at: string;
  verify_status: string;
  summary: unknown;
}

export default function StudentTranscriptPage() {
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [programId, setProgramId] = useState("PRG_BOW_TIER1");
  const [verifyResult, setVerifyResult] = useState<VerifyPayload | null>(null);

  async function load() {
    setBusy(true);
    setMessage("");
    try {
      const json = await apiFetch<Envelope<TranscriptRow[]>>("/api/me/transcript");
      setRows(json.data || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load transcripts");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function generateTranscript() {
    setMessage("");
    try {
      await apiFetch("/api/me/transcript", {
        method: "POST",
        json: {
          program_id: programId
        }
      });
      setMessage("Strategic transcript generated.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Generate failed");
    }
  }

  async function verifyTranscript(id: string) {
    setMessage("");
    setVerifyResult(null);
    try {
      const json = await apiFetch<Envelope<VerifyPayload>>(`/api/transcript/verify?transcript_id=${encodeURIComponent(id)}`);
      setVerifyResult(json.data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Verify failed");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Strategic Transcript" subtitle="Generate and verify your authenticated decision transcript" />

      <section className="card stack-10">
        <div className="grid grid-2">
          <label>
            Program ID
            <input value={programId} onChange={(e) => setProgramId(e.target.value)} />
          </label>
          <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
            <button onClick={() => void generateTranscript()}>Generate Transcript PDF</button>
            <button className="secondary" onClick={() => void load()} disabled={busy}>
              {busy ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <section className="card">
          <div className="banner">{message}</div>
        </section>
      ) : null}

      {verifyResult ? (
        <section className="card stack-6">
          <h2 className="title-18">Verification Result</h2>
          <div className="pill">Transcript ID: {verifyResult.transcript_id}</div>
          <div className="pill">Status: {verifyResult.verify_status}</div>
          <div className="pill">Email: {verifyResult.email}</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(verifyResult.summary, null, 2)}</pre>
        </section>
      ) : null}

      <section className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Transcript ID</th>
              <th>Version</th>
              <th>Program</th>
              <th>Generated</th>
              <th>Status</th>
              <th>PDF File ID</th>
              <th>Verify</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.transcript_id}>
                <td>{r.transcript_id}</td>
                <td>{r.version}</td>
                <td>{r.program_id}</td>
                <td>{r.generated_at ? new Date(r.generated_at).toLocaleString() : ""}</td>
                <td>{r.verify_status}</td>
                <td>{r.pdf_file_id}</td>
                <td>
                  <button className="secondary" onClick={() => void verifyTranscript(r.transcript_id)}>
                    Verify
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
