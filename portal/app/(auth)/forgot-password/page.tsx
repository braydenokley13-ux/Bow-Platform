"use client";

import { FormEvent, useState } from "react";
import { PageTitle } from "@/components/page-title";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Reset failed");
      setMessage("If your account exists, a reset link has been sent.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <PageTitle title="Reset Password" subtitle="Request a password reset link" />
      <form className="card" onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button disabled={busy}>{busy ? "Sending..." : "Send reset link"}</button>
        {message ? <p style={{ margin: 0 }}>{message}</p> : null}
      </form>
    </div>
  );
}
