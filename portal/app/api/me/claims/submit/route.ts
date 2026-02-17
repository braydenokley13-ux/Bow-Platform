import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const claimSchema = z.object({
  code: z.string().min(3),
  track: z.string().optional(),
  module: z.string().optional(),
  lesson: z.union([z.number().int(), z.string()]).optional(),
  name: z.string().optional(),
  tier: z.string().optional()
});

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const parsed = claimSchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid claim payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({ action: "portal.submitClaim", actor, data: parsed.data });
}
