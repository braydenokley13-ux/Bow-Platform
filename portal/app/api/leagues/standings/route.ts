import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const url = new URL(req.url);
  return runPortalAction({
    action: "portal.getLeagueStandings",
    actor,
    data: {
      scope: url.searchParams.get("scope") || "individual",
      season_id: url.searchParams.get("season_id") || ""
    }
  });
}
