import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function POST(_: Request, ctx: { params: Promise<{ raffleId: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const { raffleId } = await ctx.params;
  return runPortalAction({
    action: "portal.admin.closeDrawRaffle",
    actor,
    data: { raffle_id: raffleId }
  });
}
