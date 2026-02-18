import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({}).passthrough();

export async function PATCH(req: Request, ctx: { params: Promise<{ lessonKey: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const params = await ctx.params;
  const lessonKey = String(params.lessonKey || "").trim();
  if (!lessonKey) return badRequest("lessonKey is required", "MISSING_LESSON_KEY");

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid lesson payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.updateDraftLesson",
    actor,
    data: {
      ...parsed.data,
      lesson_key: lessonKey
    }
  });
}
