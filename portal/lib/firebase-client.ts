"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { env } from "@/lib/env";

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

function hasFirebaseClientConfig() {
  const cfg = env.firebaseClient;
  return Boolean(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId);
}

export function getFirebaseAuth(): Auth | null {
  if (typeof window === "undefined") return null;
  if (!hasFirebaseClientConfig()) return null;

  if (!cachedApp) {
    cachedApp = getApps()[0] ?? initializeApp(env.firebaseClient);
  }
  if (!cachedAuth) {
    cachedAuth = getAuth(cachedApp);
  }
  return cachedAuth;
}
