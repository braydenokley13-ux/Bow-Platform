import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET() {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.me.getCheckinStatus", actor });
}

export async function POST() {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.me.dailyCheckin", actor });
}
