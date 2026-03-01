"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

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
      setSent(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page grid gap-lg">
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Forgot your password?</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.55, fontSize: 14 }}>
          No worries — we&apos;ll send you a reset link.
        </p>
      </div>

      {sent ? (
        <div className="card auth-form" style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Check your inbox!</p>
          <p style={{ margin: "8px 0 0", opacity: 0.6, fontSize: 14 }}>
            If that email is in our system, a reset link is on its way.
          </p>
          <Link href="/login" style={{ display: "block", marginTop: 16, fontSize: 14 }}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="card auth-form form-stack" onSubmit={onSubmit}>
          <label className="field">
            <span>Your email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <button disabled={busy}>{busy ? "Sending..." : "Send reset link"}</button>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
      )}

      <p style={{ textAlign: "center", fontSize: 13, opacity: 0.6, marginTop: 0 }}>
        <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
