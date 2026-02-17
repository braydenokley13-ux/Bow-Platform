import { ok, serverError } from "@/lib/api-response";
import { portalAction } from "@/lib/portal-actions";
import type { PortalActor } from "@/types/portal";

export async function runPortalAction<T>(params: {
  action: string;
  actor: PortalActor;
  data?: unknown;
}) {
  try {
    const data = await portalAction<T>(params.action, params.actor, params.data);
    return ok({ ok: true, data });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Portal action failed");
  }
}
