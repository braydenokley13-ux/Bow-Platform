import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  module_id: z.string().min(1),
  title: z.string().min(1).max(200),
  url: z.string().url(),
  kind: z.enum(["article", "video", "podcast", "other"]).default("article"),
  description: z.string().max(500).default(""),
  xp_reward: z.number().int().min(0).max(500).default(10)
});

export async function GET() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.admin.listDeepDiveLinks", actor });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid deep-dive link payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({ action: "portal.admin.addDeepDiveLink", actor, data: parsed.data });
}
