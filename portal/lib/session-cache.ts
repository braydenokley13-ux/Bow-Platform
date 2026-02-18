"use client";

const SESSION_CACHE_KEY = "bow:session-check:v1";
const SESSION_CACHE_TTL_MS = 60_000;

export interface CachedSession {
  role: string;
  status: string;
  checkedAt: number;
}

export function readCachedSession(): CachedSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSession;
    if (!parsed || typeof parsed.checkedAt !== "number") return null;

    const age = Date.now() - parsed.checkedAt;
    if (age > SESSION_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }

    return parsed;
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
    window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache write failures
  }
}

export function clearCachedSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // ignore cache clear failures
  }
}
