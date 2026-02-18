import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const url = new URL(req.url);
  return runPortalAction({
    action: "portal.admin.getDecisionTrends",
    actor,
    data: {
      email: url.searchParams.get("email") || ""
    }
  });
}
