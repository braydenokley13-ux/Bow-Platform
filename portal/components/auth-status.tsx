"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
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

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionMeta, setSessionMeta] = useState<string>("");

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refreshSession() {
      const devMode = Boolean(process.env.NEXT_PUBLIC_DEV_ACTOR_EMAIL);
      if (!user && !devMode) {
        if (!cancelled) setSessionMeta("");
        return;
      }

      try {
        const res = await apiFetch<SessionPayload>("/api/me/session");
        const role = String(res?.data?.role || "").toUpperCase();
        const status = String(res?.data?.status || "").toUpperCase();
        if (!cancelled) {
          setSessionMeta([role, status].filter(Boolean).join(" · "));
        }
      } catch {
        if (!cancelled) setSessionMeta("");
      }
    }

    void refreshSession();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span className="pill">
        {user ? `Signed in: ${user.email}${sessionMeta ? ` · ${sessionMeta}` : ""}` : "Not signed in"}
      </span>
      {user ? (
        <button
          onClick={() => {
            void signOut(firebaseAuth);
          }}
          className="secondary"
          style={{ padding: "6px 10px", fontSize: 12 }}
        >
          Sign out
        </button>
      ) : null}
    </div>
  );
}
