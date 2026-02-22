"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/page-title";

export default function SetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, secret })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Setup failed");
      setDone(true);
      setMessage("First admin created! Redirecting to login...");
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page grid gap-lg">
      <PageTitle
        title="First-Time Setup"
        subtitle="Create the first admin account — only works when no admins exist"
      />
      {done ? (
        <div className="card auth-form">
          <p className="form-message">{message}</p>
        </div>
      ) : (
        <form className="card auth-form form-stack" onSubmit={onSubmit}>
          <label className="field">
            <span>Admin Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          <label className="field">
            <span>Bootstrap Secret</span>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Set via BOOTSTRAP_SECRET env var"
              required
            />
          </label>
          <button disabled={busy}>{busy ? "Creating admin..." : "Create first admin"}</button>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
      )}
    </div>
  );
}
