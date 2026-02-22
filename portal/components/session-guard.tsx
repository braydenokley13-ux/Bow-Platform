"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Keep pathname in a ref so redirect targets are always current without
  // re-triggering the session check on every navigation.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

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

    // Fast-path: Firebase often has the current user available synchronously
    // when the SDK has already initialised in this browser session.
    if (auth.currentUser) {
      setHasFirebaseUser(true);
      setAuthReady(true);
      // Still subscribe so we react to sign-out events.
      return onAuthStateChanged(auth, (user) => {
        setAuthTimedOut(false);
        setHasFirebaseUser(Boolean(user));
        if (!user) clearCachedSession();
      });
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

  // Timeout reduced from 7 s → 2 s: if Firebase auth hasn't resolved in 2 s
  // something is wrong; treat it as unauthenticated and redirect to login.
  useEffect(() => {
    if (authReady) return;
    const timer = setTimeout(() => {
      setAuthTimedOut(true);
      setAuthReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    setGuardError("");

    const devMode = Boolean(process.env.NEXT_PUBLIC_DEV_ACTOR_EMAIL);
    if (!hasFirebaseUser && !devMode) {
      const currentPath = pathnameRef.current;
      const reason = authTimedOut ? "&reason=auth-timeout" : "";
      router.replace(`/login?next=${encodeURIComponent(currentPath || "/dashboard")}${reason}`);
      return;
    }

    const cached = readCachedSession();
    if (cached) {
      const { session, stale } = cached;

      if (session.status === "SUSPENDED") {
        router.replace("/login?reason=suspended");
        return;
      }

      if (requireAdmin && !isAdminRole(session.role)) {
        router.replace("/dashboard");
        return;
      }

      // Render immediately — no loading screen.
      setReady(true);

      // If the cached data is stale (5–10 min old), silently revalidate in the
      // background so the next visit gets a fresh cache.
      if (stale) {
        void apiFetch<SessionPayload>("/api/me/session")
          .then((response) => {
            const role = String(response?.data?.role || "").toUpperCase();
            const status = String(response?.data?.status || "ACTIVE").toUpperCase();
            writeCachedSession(role, status);
            // If the background check reveals the account is now suspended or
            // the role no longer permits access, clear the cache so the guard
            // re-checks on the next navigation.
            if (status === "SUSPENDED" || (requireAdmin && !isAdminRole(role))) {
              clearCachedSession();
            }
          })
          .catch(() => {
            // Background revalidation failed — not critical, keep the stale
            // cache so the user isn't disrupted.
          });
      }
      return;
    }

    // No usable cache — show the loading screen and await the API.
    setReady(false);
    let cancelled = false;

    async function checkSession() {
      try {
        // Session API timeout reduced from 12 s → 8 s.
        const response = await withTimeout(apiFetch<SessionPayload>("/api/me/session"), 8000);
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
        const currentPath = pathnameRef.current;
        router.replace(`/login?next=${encodeURIComponent(currentPath || "/dashboard")}&reason=session-check`);
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  // Intentionally excludes `pathname` — route changes must not retrigger the
  // session check. `pathnameRef` keeps redirect targets up-to-date instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, hasFirebaseUser]);

  if (guardError && !ready) {
    return (
      <div className="card session-guard" role="alert">
        <div className="kicker">Session Check</div>
        <p className="session-guard-copy">
          We could not verify your access ({guardError}). You can re-open login and try again.
        </p>
        <p className="session-guard-copy">
          <Link href={`/login?next=${encodeURIComponent(pathnameRef.current || "/dashboard")}`}>Go to login</Link>
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
