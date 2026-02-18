import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  publish_batch_id: z.string().optional()
});

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid rollback payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.rollbackCurriculum",
    actor,
    data: parsed.data
  });
}
