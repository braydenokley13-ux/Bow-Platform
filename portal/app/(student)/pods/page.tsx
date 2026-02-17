"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageTitle } from "@/components/page-title";
import { apiFetch } from "@/lib/client-api";

interface PodMember {
  email: string;
  display_name: string;
  joined_at?: string;
}

interface PodKudos {
  kudos_id: string;
  from_email: string;
  to_email: string;
  from_display: string;
  to_display: string;
  message: string;
  created_at: string;
}

interface PodPayload {
  ok: boolean;
  data: {
    season_id: string;
    pod_id: string;
    pod_name: string;
    rank: number;
    points: number;
    members: PodMember[];
    recent_kudos: PodKudos[];
  } | null;
}

interface KudosPayload {
  ok: boolean;
  message: string;
  data: {
    kudos_id: string;
    awarded_points: number;
  };
}

export default function StudentPodsPage() {
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<PodPayload | null>(null);
  const [targetEmail, setTargetEmail] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<KudosPayload | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const json = await apiFetch<PodPayload>("/api/pods/me");
      setPayload(json);
      const firstMember = (json.data?.members || []).find((m) => !!m.email);
      if (firstMember && !targetEmail) setTargetEmail(firstMember.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pod");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const pod = payload?.data;
  const memberOptions = useMemo(() => (pod?.members || []).map((m) => m.email), [pod]);

  async function onSendKudos(e: FormEvent) {
    e.preventDefault();
    if (!pod?.pod_id || !targetEmail || !message.trim()) return;

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const json = await apiFetch<KudosPayload>(`/api/pods/${encodeURIComponent(pod.pod_id)}/kudos`, {
        method: "POST",
        json: {
          target_email: targetEmail,
          message: message.trim()
        }
      });
      setResult(json);
      setMessage("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send kudos");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 14 }}>
      <PageTitle title="Team Pods" subtitle="Small-team competition with private-by-default member visibility" />

      <section className="card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => void load()} disabled={busy}>
          {busy ? "Refreshing..." : "Refresh pod"}
        </button>
        <span className="pill">Kudos cap: 3 per day</span>
      </section>

      {error ? (
        <section className="card">
          <div className="banner banner-error">{error}</div>
        </section>
      ) : null}

      {pod ? (
        <>
          <section className="grid grid-2">
            <article className="card">
              <div className="kicker">Pod</div>
              <h2 style={{ margin: "8px 0" }}>{pod.pod_name}</h2>
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Rank #{pod.rank || "-"} | {pod.points || 0} points
              </p>
            </article>
            <article className="card">
              <div className="kicker">Members</div>
              <h2 style={{ margin: "8px 0" }}>{pod.members?.length || 0}</h2>
              <p style={{ margin: 0, color: "var(--muted)" }}>Only your pod roster is visible.</p>
            </article>
          </section>

          <section className="card" style={{ display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Pod Roster</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {(pod.members || []).map((member) => (
                    <tr key={member.email}>
                      <td>{member.display_name || member.email}</td>
                      <td>{member.email}</td>
                      <td>{member.joined_at ? new Date(member.joined_at).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <form className="card" onSubmit={onSendKudos} style={{ display: "grid", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Send Kudos</h2>
            <div className="grid grid-2">
              <label>
                Teammate
                <select value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} required>
                  <option value="">Select teammate</option>
                  {memberOptions.map((email) => (
                    <option key={email} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Message
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={400}
                  placeholder="Strong financial logic in your trade decision"
                  required
                />
              </label>
            </div>
            <button disabled={submitting}>{submitting ? "Sending..." : "Send kudos"}</button>
          </form>

          {result ? (
            <section className="card">
              <div className="banner banner-success">
                {result.message} (+{result.data?.awarded_points || 0} league points)
              </div>
            </section>
          ) : null}

          <section className="card" style={{ display: "grid", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Recent Pod Kudos</h2>
            {(pod.recent_kudos || []).length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(pod.recent_kudos || []).map((k) => (
                      <tr key={k.kudos_id}>
                        <td>{new Date(k.created_at).toLocaleString()}</td>
                        <td>{k.from_display || k.from_email}</td>
                        <td>{k.to_display || k.to_email}</td>
                        <td style={{ maxWidth: 480, whiteSpace: "pre-wrap" }}>{k.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ margin: 0 }}>No kudos yet.</p>
            )}
          </section>
        </>
      ) : (
        <section className="card">
          <p style={{ margin: 0 }}>No pod assignment found in the active season yet.</p>
        </section>
      )}
    </div>
  );
}
