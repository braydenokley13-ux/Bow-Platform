"use client";

import { useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface SupportTicket {
  ticket_id: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  page_context: string;
  status: string;
  priority: string;
  created_at: string;
  resolved_at: string;
  resolved_by: string;
  resolution_note: string;
}

interface TicketsPayload {
  ok: boolean;
  data: SupportTicket[];
}

export default function AdminSupportPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<TicketsPayload>("/api/admin/support");
      setTickets(res?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load support tickets");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const openCount = useMemo(
    () => tickets.filter((t) => String(t.status).toUpperCase() !== "RESOLVED").length,
    [tickets]
  );

  async function resolveTicket(ticketId: string) {
    setWorkingId(ticketId);
    setError(null);
    setMessage("");
    try {
      await apiFetch(`/api/admin/support/${encodeURIComponent(ticketId)}/resolve`, {
        method: "POST",
        json: {
          resolution_note: notesById[ticketId] || "",
          notify_student: true
        }
      });
      setMessage(`Resolved ticket ${ticketId}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve ticket");
    } finally {
      setWorkingId("");
    }
  }

  return (
    <div className="grid gap-14">
      <PageTitle title="Support Queue" subtitle="Review and resolve student support tickets" />

      <section className="card row-8-center-wrap">
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh queue"}
        </button>
        <span className="pill">Open tickets: {openCount}</span>
      </section>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {message ? <div className="banner banner-success">{message}</div> : null}

      <section className="card stack-8">
        <h2 className="title-18">Tickets</h2>

        {(tickets || []).length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Ticket</th>
                  <th>Student</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Subject / Message</th>
                  <th>Resolve</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const resolved = String(t.status).toUpperCase() === "RESOLVED";
                  return (
                    <tr key={t.ticket_id}>
                      <td>{t.created_at ? new Date(t.created_at).toLocaleString() : ""}</td>
                      <td>{t.ticket_id}</td>
                      <td>{t.email}</td>
                      <td>{t.category}</td>
                      <td>{t.priority}</td>
                      <td>{t.status}</td>
                      <td style={{ minWidth: 260 }}>
                        <div style={{ fontWeight: 700 }}>{t.subject}</div>
                        <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{t.message}</div>
                        {t.page_context ? (
                          <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
                            Context: {t.page_context}
                          </div>
                        ) : null}
                        {resolved && t.resolution_note ? (
                          <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12 }}>
                            Resolution: {t.resolution_note}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ minWidth: 240 }}>
                        {resolved ? (
                          <div className="muted-13">
                            Resolved by {t.resolved_by || "staff"}
                            <br />
                            {t.resolved_at ? new Date(t.resolved_at).toLocaleString() : ""}
                          </div>
                        ) : (
                          <div className="grid stack-8">
                            <textarea
                              rows={3}
                              placeholder="Resolution note (optional)"
                              value={notesById[t.ticket_id] || ""}
                              onChange={(e) =>
                                setNotesById((prev) => ({
                                  ...prev,
                                  [t.ticket_id]: e.target.value
                                }))
                              }
                            />
                            <button
                              onClick={() => void resolveTicket(t.ticket_id)}
                              disabled={workingId === t.ticket_id}
                            >
                              {workingId === t.ticket_id ? "Resolving..." : "Resolve"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0">No support tickets yet.</p>
        )}
      </section>
    </div>
  );
}
