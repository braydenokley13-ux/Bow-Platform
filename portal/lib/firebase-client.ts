"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { env } from "@/lib/env";

const app = getApps()[0] ?? initializeApp(env.firebaseClient);
export const firebaseAuth = getAuth(app);
