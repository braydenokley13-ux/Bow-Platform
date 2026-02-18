import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function POST() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.admin.runSmokeChecks", actor, data: {} });
}
