import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const url = new URL(req.url);
  const lookbackDays = Number(url.searchParams.get("lookback_days") || "7");

  return runPortalAction({
    action: "portal.admin.getAtRiskStudents",
    actor,
    data: {
      lookback_days: Number.isFinite(lookbackDays) ? lookbackDays : 7,
      persist_snapshots: true
    }
  });
}
