import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";
import { ok } from "@/lib/api-response";
import { hasPortalBackendConfig } from "@/lib/env";

export async function GET() {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  if (!hasPortalBackendConfig()) {
    return ok({
      ok: true,
      data: {
        email: actor.email,
        role: actor.role,
        status: "ACTIVE"
      }
    });
  }

  return runPortalAction({ action: "portal.getSession", actor });
}
