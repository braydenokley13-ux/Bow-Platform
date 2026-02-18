"use client";

import { useEffect, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface Kudos {
  kudos_id: string;
  sender_email: string;
  sender_name?: string;
  recipient_email: string;
  recipient_name?: string;
  message: string;
  pinned: boolean;
  xp_awarded?: number;
  sent_at: string;
}

interface KudosPayload {
  ok: boolean;
  data: { kudos: Kudos[]; has_more?: boolean; cursor?: string };
}

export default function KudosPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kudos, setKudos] = useState<Kudos[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState("");
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  async function load(append = false) {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (append && cursor) params.set("cursor", cursor);
      const res = await apiFetch<KudosPayload>(`/api/kudos?${params}`);
      const incoming = res.data.kudos ?? [];
      setKudos((prev) => (append ? [...prev, ...incoming] : incoming));
      setCursor(res.data.cursor ?? "");
      setHasMore(res.data.has_more ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load kudos");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!recipient.trim() || !message.trim()) return;
    setSending(true);
    setStatusMsg("");
    setError(null);
    try {
      await apiFetch("/api/kudos", {
        method: "POST",
        json: { recipient_email: recipient.trim().toLowerCase(), message: message.trim() }
      });
      setRecipient("");
      setMessage("");
      setStatusMsg("Shoutout sent!");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send shoutout");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const pinned = kudos.filter((k) => k.pinned);
  const rest = kudos.filter((k) => !k.pinned);

  return (
    <div className="grid gap-14">
      <PageTitle title="Kudos Wall" subtitle="Public shoutouts — celebrate your classmates" />

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}
      {statusMsg ? <section className="card"><div className="banner">{statusMsg}</div></section> : null}

      <section className="card stack-10">
        <h2 style={{ margin: 0, fontSize: 16 }}>Send a Shoutout</h2>
        <div className="grid grid-2">
          <label>
            Recipient email
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="classmate@example.com"
              type="email"
            />
          </label>
          <label>
            Message <span style={{ opacity: 0.5, fontWeight: 400 }}>(max 280 chars)</span>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={280}
              placeholder="Crushed the salary cap challenge today!"
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => void send()} disabled={sending || !recipient.trim() || !message.trim()}>
            {sending ? "Sending..." : "Send Shoutout"}
          </button>
          <span style={{ fontSize: 12, opacity: 0.45 }}>{message.length}/280</span>
        </div>
      </section>

      {pinned.length > 0 ? (
        <section className="card stack-8">
          <div className="kicker">📌 Pinned by Instructor</div>
          {pinned.map((k) => <KudosCard key={k.kudos_id} k={k} />)}
        </section>
      ) : null}

      <section className="card" style={{ display: "grid", gap: 2, padding: 0 }}>
        {!busy && rest.length === 0 && pinned.length === 0 ? (
          <p style={{ margin: 12, opacity: 0.6 }}>No shoutouts yet. Be the first to celebrate a classmate.</p>
        ) : null}
        {rest.map((k, idx) => (
          <div key={k.kudos_id} style={{ borderBottom: idx < rest.length - 1 ? "1px solid var(--border, #e5e7eb)" : "none" }}>
            <KudosCard k={k} />
          </div>
        ))}
      </section>

      {hasMore ? (
        <section className="card">
          <button className="secondary" onClick={() => void load(true)} disabled={busy}>
            {busy ? "Loading..." : "Load more"}
          </button>
        </section>
      ) : null}
    </div>
  );
}

function KudosCard({ k }: { k: Kudos }) {
  return (
    <div style={{ padding: "12px 16px" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontWeight: 700 }}>{k.sender_name ?? k.sender_email}</span>
        <span style={{ opacity: 0.5 }}>→</span>
        <span style={{ fontWeight: 700 }}>{k.recipient_name ?? k.recipient_email}</span>
        {k.xp_awarded ? <span className="pill" style={{ fontSize: 12 }}>+{k.xp_awarded} XP</span> : null}
        <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.4 }}>
          {new Date(k.sent_at).toLocaleDateString()}
        </span>
      </div>
      <p className="m-0">{k.message}</p>
    </div>
  );
}
