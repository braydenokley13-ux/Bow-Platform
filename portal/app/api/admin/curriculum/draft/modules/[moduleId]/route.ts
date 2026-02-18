import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({}).passthrough();

export async function PATCH(req: Request, ctx: { params: Promise<{ moduleId: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const params = await ctx.params;
  const moduleId = String(params.moduleId || "").trim();
  if (!moduleId) return badRequest("moduleId is required", "MISSING_MODULE_ID");

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid module payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.updateDraftModule",
    actor,
    data: {
      ...parsed.data,
      module_id: moduleId
    }
  });
}
