import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error;

  const url = new URL(req.url);
  const limitRaw = Number(url.searchParams.get("limit") || "5");
  return runPortalAction({
    action: "portal.getNextBestLessons",
    actor,
    data: {
      track: url.searchParams.get("track") || "",
      limit: Number.isFinite(limitRaw) ? limitRaw : 5
    }
  });
}
