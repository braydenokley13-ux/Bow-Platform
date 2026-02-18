import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  kind: z.enum(["article", "video", "podcast", "other"]).optional(),
  description: z.string().max(500).optional(),
  xp_reward: z.number().int().min(0).max(500).optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid patch payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.updateDeepDiveLink",
    actor,
    data: { link_id: id, ...parsed.data }
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const { id } = await params;
  return runPortalAction({ action: "portal.admin.deleteDeepDiveLink", actor, data: { link_id: id } });
}
