import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const url = new URL(req.url);
  const limit = url.searchParams.get("limit") ?? "50";
  const cursor = url.searchParams.get("cursor") ?? "";

  return runPortalAction({
    action: "portal.me.getActivityTimeline",
    actor,
    data: { limit: Number(limit), cursor }
  });
}
