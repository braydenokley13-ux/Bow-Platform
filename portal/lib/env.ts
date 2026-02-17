function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "BOW Sports Capital",
  portalBaseUrl: process.env.PORTAL_BASE_URL ?? "http://localhost:3000",

  appsScript: {
    url: process.env.APPS_SCRIPT_WEB_APP_URL ?? "",
    sharedSecret: process.env.APPS_SCRIPT_SHARED_SECRET ?? ""
  },

  firebaseClient: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? ""
  },

  firebaseAdmin: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : ""
  }
};

export function assertPortalBackendConfigured() {
  required("APPS_SCRIPT_WEB_APP_URL");
  required("APPS_SCRIPT_SHARED_SECRET");
}
