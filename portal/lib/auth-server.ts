import { headers } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import type { PortalActor, Role } from "@/types/portal";

const ALLOWED_ROLES = new Set<Role>(["STUDENT", "INSTRUCTOR", "ADMIN"]);

function normalizeRole(value: string | undefined): Role {
  const candidate = String(value || "STUDENT").toUpperCase() as Role;
  return ALLOWED_ROLES.has(candidate) ? candidate : "STUDENT";
}

export async function getActorFromRequest(): Promise<PortalActor | null> {
  const h = await headers();

  // Local/dev fallback so backend can be tested before auth wiring is complete.
  const devEmail = h.get("x-portal-email");
  const devRole = h.get("x-portal-role");
  if (devEmail) {
    return {
      email: devEmail.toLowerCase(),
      role: normalizeRole(devRole || "STUDENT")
    };
  }

  if (process.env.DEV_ACTOR_EMAIL) {
    return {
      email: String(process.env.DEV_ACTOR_EMAIL).toLowerCase(),
      role: normalizeRole(process.env.DEV_ACTOR_ROLE || "ADMIN")
    };
  }

  const authHeader = h.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) return null;

  const decoded = await adminAuth().verifyIdToken(idToken);
  const role = normalizeRole((decoded.role as string | undefined) || "STUDENT");

  return {
    email: String(decoded.email || "").toLowerCase(),
    role
  };
}

export function isAdminRole(role: Role) {
  return role === "ADMIN" || role === "INSTRUCTOR";
}
