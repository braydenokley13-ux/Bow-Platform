import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET() {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.me.getOnboardingStatus", actor });
}

const bodySchema = z.object({
  step: z.string(),
  done: z.boolean().optional().default(true),
  dismissed: z.boolean().optional().default(false)
});

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid onboarding payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.me.updateOnboarding",
    actor,
    data: parsed.data
  });
}
