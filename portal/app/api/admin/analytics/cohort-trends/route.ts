import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const url = new URL(req.url);
  const weeksBack = Number(url.searchParams.get("weeks_back") || "8");

  return runPortalAction({
    action: "portal.admin.getCohortTrends",
    actor,
    data: {
      weeks_back: Number.isFinite(weeksBack) ? weeksBack : 8
    }
  });
}
