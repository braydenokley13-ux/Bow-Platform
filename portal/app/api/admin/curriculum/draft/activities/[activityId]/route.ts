import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({}).passthrough();

export async function PATCH(req: Request, ctx: { params: Promise<{ activityId: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const params = await ctx.params;
  const activityId = String(params.activityId || "").trim();
  if (!activityId) return badRequest("activityId is required", "MISSING_ACTIVITY_ID");

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid activity payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.updateDraftActivity",
    actor,
    data: {
      ...parsed.data,
      activity_id: activityId
    }
  });
}
