"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/client-api";
import { clearCachedSession, readCachedSession, writeCachedSession } from "@/lib/session-cache";

interface SessionPayload {
  ok: boolean;
  data: {
    email: string;
    role: string;
    status: string;
  };
}

function isAdminRole(role: string) {
  const r = String(role || "").toUpperCase();
  return r === "ADMIN" || r === "INSTRUCTOR";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Session verification timed out"));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function SessionGuard({
  children,
  requireAdmin = false
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [authReady, setAuthReady] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [hasFirebaseUser, setHasFirebaseUser] = useState(false);
  const [ready, setReady] = useState(false);
  const [guardError, setGuardError] = useState<string>("");

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setHasFirebaseUser(false);
      setAuthReady(true);
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setAuthTimedOut(false);
      setHasFirebaseUser(Boolean(user));
      if (!user) {
        clearCachedSession();
      }
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (authReady) return;
    const timer = setTimeout(() => {
      setAuthTimedOut(true);
      setAuthReady(true);
    }, 7000);

    return () => clearTimeout(timer);
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    setReady(false);
    setGuardError("");

    const devMode = Boolean(process.env.NEXT_PUBLIC_DEV_ACTOR_EMAIL);
    if (!hasFirebaseUser && !devMode) {
      const reason = authTimedOut ? "&reason=auth-timeout" : "";
      router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}${reason}`);
      return;
    }

    const cached = readCachedSession();
    if (cached) {
      if (cached.status === "SUSPENDED") {
        router.replace("/login?reason=suspended");
        return;
      }

      if (requireAdmin && !isAdminRole(cached.role)) {
        router.replace("/dashboard");
        return;
      }

      setReady(true);
      return;
    }

    let cancelled = false;

    async function checkSession() {
      try {
        const response = await withTimeout(apiFetch<SessionPayload>("/api/me/session"), 12000);
        const role = String(response?.data?.role || "").toUpperCase();
        const status = String(response?.data?.status || "ACTIVE").toUpperCase();
        writeCachedSession(role, status);

        if (status === "SUSPENDED") {
          router.replace("/login?reason=suspended");
          return;
        }

        if (requireAdmin && !isAdminRole(role)) {
          router.replace("/dashboard");
          return;
        }

        if (!cancelled) setReady(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Session check failed";
        if (cancelled) return;
        setGuardError(message);
        router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}&reason=session-check`);
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [authReady, authTimedOut, hasFirebaseUser, pathname, requireAdmin, router]);

  if (guardError && !ready) {
    return (
      <div className="card session-guard" role="alert">
        <div className="kicker">Session Check</div>
        <p className="session-guard-copy">
          We could not verify your access ({guardError}). You can re-open login and try again.
        </p>
        <p className="session-guard-copy">
          <Link href={`/login?next=${encodeURIComponent(pathname || "/dashboard")}`}>Go to login</Link>
        </p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="card session-guard" role="status" aria-live="polite">
        <div className="kicker">Session Check</div>
        <p className="session-guard-copy">Verifying your portal access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
