"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { clearCachedSession } from "@/lib/session-cache";

export function AuthStatus() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser) clearCachedSession();
      setUser(nextUser);
    });
  }, []);

  return (
    <div className="auth-status">
      <span className="pill">{user ? `Signed in: ${user.email}` : "Not signed in"}</span>
      {user ? (
        <button
          type="button"
          className="secondary auth-signout"
          onClick={() => {
            const auth = getFirebaseAuth();
            if (auth) {
              clearCachedSession();
              void signOut(auth);
            }
          }}
        >
          Sign out
        </button>
      ) : null}
    </div>
  );
}
