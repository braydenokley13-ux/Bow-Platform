import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";
import { badRequest } from "@/lib/api-response";

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;
  let body: { reward_id?: string };
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
  if (!body.reward_id) return badRequest("reward_id required");
  return runPortalAction({ action: "portal.redeemReward", actor, data: { reward_id: body.reward_id } });
}
