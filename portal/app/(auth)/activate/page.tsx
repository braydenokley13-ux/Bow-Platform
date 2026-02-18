"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";

export default function ActivatePage() {
  const [inviteId, setInviteId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteId, email, password })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Activation failed");
      setMessage("Activation complete. You can now log in.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page grid gap-lg">
      <PageTitle title="Activate Account" subtitle="Use your invite ID to activate class access" />
      <form className="card auth-form form-stack form-wide" onSubmit={onSubmit}>
        <label className="field">
          <span>Invite ID</span>
          <input value={inviteId} onChange={(e) => setInviteId(e.target.value)} required />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>New Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <button disabled={busy}>{busy ? "Activating..." : "Activate account"}</button>
        {message ? <p className="form-message">{message}</p> : null}
      </form>
    </div>
  );
}
