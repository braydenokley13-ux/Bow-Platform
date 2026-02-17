import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({}).passthrough();

export async function PATCH(req: Request, ctx: { params: Promise<{ programId: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const params = await ctx.params;
  const programId = String(params.programId || "").trim();
  if (!programId) return badRequest("programId is required", "MISSING_PROGRAM_ID");

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid program payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.updateDraftProgram",
    actor,
    data: {
      ...parsed.data,
      program_id: programId
    }
  });
}
