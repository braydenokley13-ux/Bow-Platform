import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";
import { badRequest } from "@/lib/api-response";

export async function GET() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.admin.listAnnouncements", actor });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
  return runPortalAction({ action: "portal.admin.upsertAnnouncement", actor, data: body });
}
