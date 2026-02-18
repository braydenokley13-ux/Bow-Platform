"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PageTitle } from "@/components/page-title";
import { EmptyState } from "@/components/empty-state";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch } from "@/lib/client-api";

interface FAQ {
  faq_id: string;
  question: string;
  answer: string;
  audience?: string;
}

interface HelpPayload {
  ok: boolean;
  data: { faqs: FAQ[] };
}

interface TicketResponse {
  ok: boolean;
  data: { ticket_id: string; status: string; priority: string };
}

const CATEGORY_OPTIONS = ["GENERAL", "CLAIM", "RAFFLE", "AUTH", "BUG", "TECH"];

export default function HelpPage() {
  const pathname = usePathname();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqBusy, setFaqBusy] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const [category, setCategory] = useState("GENERAL");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFaqs = useCallback(async () => {
    setFaqBusy(true);
    setFaqError(null);
    try {
      const res = await apiFetch<HelpPayload>("/api/help");
      setFaqs(res.data?.faqs ?? []);
    } catch (err) {
      setFaqError(err instanceof Error ? err.message : "Failed to load FAQ");
    } finally {
      setFaqBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch<TicketResponse>("/api/support/ticket", {
        method: "POST",
        json: { category, subject, message, page_context: pathname || "" }
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

      <section className="card stack-10">
        <h2 className="title-18">Frequently Asked Questions</h2>
        {faqError ? <FeedbackBanner kind="error">{faqError}</FeedbackBanner> : null}
        {faqBusy ? (
          <LoadingSkeleton lines={4} />
        ) : faqs.length === 0 ? (
          <EmptyState title="No FAQ entries yet" body="Check back soon for common questions and answers." />
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {faqs.map((faq) => {
              const isOpen = openFaq === faq.faq_id;
              return (
                <div
                  key={faq.faq_id}
                  style={{
                    border: "1px solid var(--border, #e5e7eb)",
                    borderRadius: 8,
                    overflow: "hidden"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : faq.faq_id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "12px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      fontWeight: 600,
                      fontSize: 14
                    }}
                  >
                    <span>{faq.question}</span>
                    <span style={{ fontSize: 18, opacity: 0.5, flexShrink: 0 }}>{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen ? (
                    <div
                      style={{
                        padding: "0 16px 14px",
                        fontSize: 14,
                        lineHeight: 1.6,
                        borderTop: "1px solid var(--border, #e5e7eb)"
                      }}
                    >
                      <p className="m-0" style={{ paddingTop: 12 }}>{faq.answer}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card stack-12">
        <h2 className="title-18">Contact Support</h2>
        <p className="m-0 text-muted">If something is blocked, send a ticket and staff will review it.</p>

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

        <form onSubmit={(e) => void onSubmit(e)} className="grid stack-10">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
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
              onClick={() => { setSubject(""); setMessage(""); setCategory("GENERAL"); setError(""); setSuccess(""); }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
