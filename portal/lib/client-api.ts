"use client";

import { getFirebaseAuth } from "@/lib/firebase-client";

export async function apiFetch<T = unknown>(
  input: string,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers = new Headers(init?.headers || {});

  if (!headers.has("content-type") && init?.json !== undefined) {
    headers.set("content-type", "application/json");
  }

  const user = getFirebaseAuth()?.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) headers.set("authorization", `Bearer ${token}`);
    } catch {
      // Continue without token. Server can still allow dev fallback if configured.
    }
  }

  const allowDevHeaders = process.env.NODE_ENV !== "production";
  if (allowDevHeaders && !headers.has("x-portal-email") && process.env.NEXT_PUBLIC_DEV_ACTOR_EMAIL) {
    headers.set("x-portal-email", process.env.NEXT_PUBLIC_DEV_ACTOR_EMAIL);
    headers.set("x-portal-role", process.env.NEXT_PUBLIC_DEV_ACTOR_ROLE || "ADMIN");
  }

  const res = await fetch(input, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body
  });

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return payload as T;
}
