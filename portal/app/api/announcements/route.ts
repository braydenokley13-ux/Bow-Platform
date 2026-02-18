import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";
import { badRequest } from "@/lib/api-response";

export async function GET() {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.getActiveAnnouncements", actor });
}

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;
  let body: { announcement_id?: string };
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
  if (!body.announcement_id) return badRequest("announcement_id required");
  return runPortalAction({ action: "portal.dismissAnnouncement", actor, data: body });
}
