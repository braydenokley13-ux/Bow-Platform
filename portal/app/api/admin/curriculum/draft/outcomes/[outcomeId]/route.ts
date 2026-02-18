import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({}).passthrough();

export async function PATCH(req: Request, ctx: { params: Promise<{ outcomeId: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const params = await ctx.params;
  const outcomeId = String(params.outcomeId || "").trim();
  if (!outcomeId) return badRequest("outcomeId is required", "MISSING_OUTCOME_ID");

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid outcome payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.updateDraftOutcome",
    actor,
    data: {
      ...parsed.data,
      outcome_id: outcomeId
    }
  });
}
