import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const url = new URL(req.url);
  const checkLinks = url.searchParams.get("check_links") === "true";
  return runPortalAction({
    action: "portal.admin.getContentValidation",
    actor,
    data: {
      check_links: checkLinks,
      persist: true
    }
  });
}
