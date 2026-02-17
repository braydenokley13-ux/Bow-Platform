import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "@/lib/env";

function ensureAdminApp() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: env.firebaseAdmin.projectId,
        clientEmail: env.firebaseAdmin.clientEmail,
        privateKey: env.firebaseAdmin.privateKey
      })
    });
  }
}

export function adminAuth() {
  ensureAdminApp();
  return getAuth();
}

export function adminDb() {
  ensureAdminApp();
  return getFirestore();
}
