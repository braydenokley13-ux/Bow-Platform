"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/page-title";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/client-api";

interface SessionPayload {
  ok: boolean;
  data: {
    email: string;
    role: string;
    status: string;
  };
}

function sanitizeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  const nextPath = raw.trim();
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return null;
  if (
    nextPath.startsWith("/login") ||
    nextPath.startsWith("/activate") ||
    nextPath.startsWith("/forgot-password")
  ) {
    return null;
  }
  return nextPath;
}

function defaultPathForRole(role: string) {
  const normalized = String(role || "STUDENT").toUpperCase();
  if (normalized === "ADMIN" || normalized === "INSTRUCTOR") {
    return "/admin/overview";
  }
  return "/home";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState("");

  const nextPath = useMemo(() => sanitizeNextPath(searchParams.get("next")), [searchParams]);
  const reason = searchParams.get("reason");

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setCheckingAuth(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCheckingAuth(false);
        return;
      }

      setCheckingAuth(true);

      async function openPortal() {
        let destination = nextPath ?? "/home";
        try {
          const session = await apiFetch<SessionPayload>("/api/me/session");
          const status = String(session?.data?.status || "ACTIVE").toUpperCase();
          if (status === "SUSPENDED") {
            setMessage("Your account is suspended. Contact support.");
            setCheckingAuth(false);
            return;
          }
          destination = nextPath ?? defaultPathForRole(session?.data?.role || "STUDENT");
        } catch {
          // If session metadata fetch fails, still move the user into the app shell.
          destination = nextPath ?? "/home";
        }

        router.replace(destination as never);
      }

      void openPortal();
    });

    return () => unsubscribe();
  }, [nextPath, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Firebase client config missing. Add NEXT_PUBLIC_FIREBASE_* environment variables.");
      }
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setMessage("Signed in. Opening portal...");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page grid gap-lg">
      <PageTitle title="Portal Login" subtitle="Invite-only access for BOW class users" />

      {reason === "session-check" ? (
        <div className="banner banner-warn">Your session expired. Please sign in again.</div>
      ) : null}

      <form className="card auth-form form-stack" onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button disabled={busy || checkingAuth}>{busy || checkingAuth ? "Signing in..." : "Sign in"}</button>
        {message ? <p className="form-message">{message}</p> : null}
      </form>
    </div>
  );
}
