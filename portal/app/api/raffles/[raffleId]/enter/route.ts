import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  ticketsSpent: z.number().int().positive()
});

export async function POST(req: Request, ctx: { params: Promise<{ raffleId: string }> }) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error;

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return badRequest("Invalid raffle entry payload", "INVALID_PAYLOAD", body.error.flatten());
  }

  const { raffleId } = await ctx.params;

  return runPortalAction({
    action: "portal.enterRaffle",
    actor,
    data: {
      raffle_id: raffleId,
      tickets_spent: body.data.ticketsSpent
    }
  });
}
