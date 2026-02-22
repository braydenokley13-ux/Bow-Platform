"use client";

const SESSION_CACHE_KEY = "bow:session-check:v2";
const SESSION_CACHE_FRESH_MS = 5 * 60_000;  // 5 min → use as-is, no background check
const SESSION_CACHE_STALE_MS = 10 * 60_000; // 10 min → use but revalidate in background

export interface CachedSession {
  role: string;
  status: string;
  checkedAt: number;
}

export function readCachedSession(): { session: CachedSession; stale: boolean } | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSession;
    if (!parsed || typeof parsed.checkedAt !== "number") return null;

    const age = Date.now() - parsed.checkedAt;
    if (age > SESSION_CACHE_STALE_MS) {
      window.localStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }

    return { session: parsed, stale: age > SESSION_CACHE_FRESH_MS };
  } catch {
    return null;
  }
}

export function writeCachedSession(role: string, status: string) {
  if (typeof window === "undefined") return;

  const payload: CachedSession = {
    role: String(role || "").toUpperCase(),
    status: String(status || "").toUpperCase(),
    checkedAt: Date.now()
  };

  try {
    window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache write failures
  }
}

export function clearCachedSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_CACHE_KEY);
    // also clear old v1 key on logout
    window.sessionStorage.removeItem("bow:session-check:v1");
  } catch {
    // ignore cache clear failures
  }
}
