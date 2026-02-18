"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";
import { PageTitle } from "@/components/page-title";
import { FetchPanel } from "@/components/fetch-panel";
import { apiFetch } from "@/lib/client-api";

interface TicketResponse {
  ok: boolean;
  data: {
    ticket_id: string;
    status: string;
    priority: string;
  };
}

const CATEGORY_OPTIONS = ["GENERAL", "CLAIM", "RAFFLE", "AUTH", "BUG", "TECH"];

export default function HelpPage() {
  const pathname = usePathname();
  const [category, setCategory] = useState("GENERAL");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await apiFetch<TicketResponse>("/api/support/ticket", {
        method: "POST",
        json: {
          category,
          subject,
          message,
          page_context: pathname || ""
        }
      });

      setSuccess(
        `Support ticket ${res?.data?.ticket_id || ""} created (${res?.data?.priority || "LOW"} priority).`
      );
      setSubject("");
      setMessage("");
      setCategory("GENERAL");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit support ticket");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Help Center" subtitle="FAQ and support guidance" />

      <FetchPanel endpoint="/api/help" title="FAQ" />

      <section className="card stack-12">
        <h2 className="title-18">Contact Support</h2>
        <p className="m-0 text-muted">
          If something is blocked, send a ticket and staff will review it.
        </p>

        {error ? (
          <div className="banner banner-error">
            <strong>Support ticket failed:</strong> {error}
          </div>
        ) : null}

        {success ? (
          <div className="banner banner-success">
            <strong>Submitted:</strong> {success}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="grid stack-10">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label>
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Short summary of the issue"
              minLength={3}
              maxLength={160}
              required
            />
          </label>

          <label>
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="What happened, what you expected, and what screen you are on"
              minLength={5}
              maxLength={5000}
              required
            />
          </label>

          <div className="row-8">
            <button disabled={busy}>{busy ? "Submitting..." : "Submit support ticket"}</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setSubject("");
                setMessage("");
                setCategory("GENERAL");
                setError("");
                setSuccess("");
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
