"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/client-api";
import { BowArcade } from "@/components/bow-arcade";

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
  const [checkingAuth, setCheckingAuth] = useState(false);
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
        return;
      }

      setCheckingAuth(true);
      setMessage("");

      async function openPortal() {
        let session: SessionPayload | null = null;
        try {
          session = await apiFetch<SessionPayload>("/api/me/session", { timeoutMs: 12000 });
        } catch (err) {
          const isTimeout =
            err instanceof Error &&
            (err.message === "Request timed out" || /timeout/i.test(err.message));
          if (isTimeout) {
            router.replace((nextPath ?? defaultPathForRole("STUDENT")) as never);
            return;
          }
          try {
            await signOut(auth);
          } catch {
            // ignore
          }
          setMessage("Something went wrong verifying your account. Please try again.");
          setCheckingAuth(false);
          return;
        }

        const status = String(session?.data?.status || "ACTIVE").toUpperCase();
        if (status === "SUSPENDED") {
          setMessage("Your account has been suspended. Please contact support.");
          setCheckingAuth(false);
          return;
        }
        const destination = nextPath ?? defaultPathForRole(session?.data?.role || "STUDENT");
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
        throw new Error("Sign-in is not available right now. Please try again shortly.");
      }
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setCheckingAuth(true);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      const isInvalidCredential =
        raw.includes("auth/invalid-credential") ||
        raw.includes("auth/wrong-password") ||
        raw.includes("auth/user-not-found");
      if (isInvalidCredential) {
        setMessage("Incorrect email or password. Need to activate your account? Check your inbox.");
      } else {
        setMessage(raw || "Sign-in failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (checkingAuth && !message) {
    return <BowArcade statusMessage="Signing you in\u2026" />;
  }

  return (
    <div className="auth-page grid gap-lg">
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Welcome back!</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.55, fontSize: 14 }}>Sign in to your account</p>
      </div>

      {reason === "session-check" || reason === "auth-timeout" ? (
        <div className="banner banner-warn">Your session expired. Please sign in again.</div>
      ) : null}

      <form className="card auth-form form-stack" onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Your password"
            required
          />
        </label>

        <div style={{ textAlign: "right", marginTop: -4 }}>
          <Link href="/forgot-password" style={{ fontSize: 13, opacity: 0.65 }}>
            Forgot password?
          </Link>
        </div>

        <button disabled={busy || checkingAuth} style={{ marginTop: 4 }}>
          {busy || checkingAuth ? "Signing in..." : "Sign in"}
        </button>

        {message ? <p className="form-message">{message}</p> : null}
      </form>

      <p style={{ textAlign: "center", fontSize: 13, opacity: 0.6, marginTop: 0 }}>
        New here?{" "}
        <Link href="/activate">Activate your account</Link>
      </p>
    </div>
  );
}
