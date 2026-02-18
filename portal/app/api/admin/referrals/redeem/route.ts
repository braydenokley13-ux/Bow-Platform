import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  referral_code: z.string().min(1),
  referred_email: z.string().email(),
  xp_amount: z.number().int().min(0).optional()
});

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.redeemReferral",
    actor,
    data: parsed.data
  });
}
