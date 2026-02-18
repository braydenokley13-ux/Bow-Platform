import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  title: z.string().min(2),
  prize: z.string().min(2),
  opens_at: z.string().optional(),
  closes_at: z.string().optional()
});

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid raffle payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.createRaffle",
    actor,
    data: parsed.data
  });
}

export async function GET() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.getActiveRaffle", actor });
}
