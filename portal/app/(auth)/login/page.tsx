"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/client-api";
import { clearCachedSession, writeCachedSession } from "@/lib/session-cache";
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

      const currentUser = user; // narrowed to non-null for async closure below

      setCheckingAuth(true);
      setMessage("");

      async function openPortal() {
        // Fast-path: read role from the locally-cached Firebase ID token (no
        // network call needed). The role custom claim was set during account
        // activation and is embedded in the signed JWT.
        let roleFromClaims = "STUDENT";
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          roleFromClaims = String(tokenResult.claims.role || "STUDENT").toUpperCase();
        } catch {
          // Ignore — fall back to STUDENT role.
        }

        // Write an optimistic session cache so SessionGuard on the destination
        // page renders immediately without making another API call.
        writeCachedSession(roleFromClaims, "ACTIVE");

        // Redirect right away — don't block on the Apps Script session check.
        const destination = nextPath ?? defaultPathForRole(roleFromClaims);
        router.replace(destination as never);

        // Background: verify status (catches SUSPENDED accounts). If the check
        // returns before the page unloads, update the cache; the SessionGuard
        // will pick it up on any subsequent navigation.
        void apiFetch<SessionPayload>("/api/me/session", { timeoutMs: 12000 })
          .then((session) => {
            const role = String(session?.data?.role || roleFromClaims).toUpperCase();
            const status = String(session?.data?.status || "ACTIVE").toUpperCase();
            if (status === "SUSPENDED") {
              // Clear the optimistic cache so the SessionGuard will redirect
              // the user to login as soon as any protected page is visited.
              clearCachedSession();
            } else {
              writeCachedSession(role, status);
            }
          })
          .catch(() => {
            // Background check failed — optimistic cache remains; the user
            // stays logged in. This matches existing timeout-fallback behavior.
          });
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
