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
  sent_at: string;
}

interface KudosPayload {
  ok: boolean;
  data: { kudos: Kudos[] };
}

export default function AdminKudosPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kudos, setKudos] = useState<Kudos[]>([]);
  const [pinning, setPinning] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<KudosPayload>("/api/kudos?limit=200");
      setKudos(res.data.kudos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load kudos");
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(k: Kudos) {
    setPinning(k.kudos_id);
    try {
      await apiFetch(`/api/admin/kudos/${k.kudos_id}/pin`, {
        method: "POST",
        json: { pinned: !k.pinned }
      });
      setKudos((prev) =>
        prev.map((x) => (x.kudos_id === k.kudos_id ? { ...x, pinned: !x.pinned } : x))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update pin");
    } finally {
      setPinning(null);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="grid gap-14">
      <PageTitle title="Kudos Management" subtitle="Pin standout shoutouts to feature them on the Kudos Wall" />

      <section className="card row-8">
        <button onClick={() => void load()} disabled={busy}>{busy ? "Loading..." : "Refresh"}</button>
      </section>

      {error ? <section className="card"><div className="banner banner-error">{error}</div></section> : null}

      <section className="card p-0">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Message</th>
                <th>Date</th>
                <th>Pinned</th>
              </tr>
            </thead>
            <tbody>
              {kudos.length === 0 && !busy ? (
                <tr><td colSpan={5} style={{ textAlign: "center", opacity: 0.5 }}>No kudos yet.</td></tr>
              ) : null}
              {kudos.map((k) => (
                <tr key={k.kudos_id}>
                  <td>{k.sender_name ?? k.sender_email}</td>
                  <td>{k.recipient_name ?? k.recipient_email}</td>
                  <td style={{ maxWidth: 300 }}>{k.message}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{new Date(k.sent_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="secondary"
                      style={{ padding: "2px 10px", fontSize: 13 }}
                      onClick={() => void togglePin(k)}
                      disabled={pinning === k.kudos_id}
                    >
                      {k.pinned ? "Unpin" : "Pin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
