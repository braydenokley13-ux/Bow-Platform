import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const url = new URL(req.url);
  return runPortalAction({
    action: "portal.getMyRaffleEntries",
    actor,
    data: {
      raffle_id: url.searchParams.get("raffleId") || ""
    }
  });
}
