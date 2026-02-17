import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function POST(_req: Request, ctx: { params: Promise<{ questId: string }> }) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const params = await ctx.params;
  const questId = String(params.questId || "").trim();
  if (!questId) return badRequest("questId is required", "MISSING_QUEST_ID");

  return runPortalAction({
    action: "portal.claimQuestReward",
    actor,
    data: { quest_id: questId }
  });
}
