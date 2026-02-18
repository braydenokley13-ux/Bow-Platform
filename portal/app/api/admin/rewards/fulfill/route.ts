import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";
import { badRequest } from "@/lib/api-response";

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  let body: { redemption_id?: string; note?: string };
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
  if (!body.redemption_id) return badRequest("redemption_id required");
  return runPortalAction({ action: "portal.admin.fulfillRedemption", actor, data: body });
}
