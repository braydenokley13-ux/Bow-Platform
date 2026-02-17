"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/client-api";

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
  const [hasFirebaseUser, setHasFirebaseUser] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (user) => {
      setHasFirebaseUser(Boolean(user));
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authReady) return;

    const devMode = Boolean(process.env.NEXT_PUBLIC_DEV_ACTOR_EMAIL);
    if (!hasFirebaseUser && !devMode) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
      return;
    }

    let cancelled = false;

    async function checkSession() {
      try {
        const response = await apiFetch<SessionPayload>("/api/me/session");
        const role = String(response?.data?.role || "").toUpperCase();
        const status = String(response?.data?.status || "ACTIVE").toUpperCase();

        if (status === "SUSPENDED") {
          router.replace("/login?reason=suspended");
          return;
        }

        if (requireAdmin && !isAdminRole(role)) {
          router.replace("/dashboard");
          return;
        }

        if (!cancelled) setReady(true);
      } catch {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [authReady, hasFirebaseUser, pathname, requireAdmin, router]);

  if (!ready) {
    return (
      <div className="card" style={{ marginTop: 16 }}>
        <div className="kicker">Session Check</div>
        <p style={{ margin: "8px 0 0 0" }}>Verifying your portal access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
