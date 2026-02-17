import { badRequest, forbidden, unauthorized } from "@/lib/api-response";
import { getActorFromRequest, isAdminRole } from "@/lib/auth-server";
import type { PortalActor } from "@/types/portal";

export async function requireActor() {
  const actor = await getActorFromRequest();
  if (!actor || !actor.email) {
    return { actor: null as PortalActor | null, error: unauthorized() };
  }
  return { actor, error: null };
}

export async function requireAdminActor() {
  const base = await requireActor();
  if (!base.actor) return base;
  if (!isAdminRole(base.actor.role)) {
    return { actor: null as PortalActor | null, error: forbidden("Admin role required") };
  }
  return { actor: base.actor, error: null };
}

export async function readJsonBody<T>(req: Request) {
  try {
    const json = (await req.json()) as T;
    return { data: json, error: null };
  } catch {
    return { data: null as T | null, error: badRequest("Invalid JSON body") };
  }
}
