import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";
import { badRequest } from "@/lib/api-response";

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  let body: { student_email?: string };
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
  if (!body.student_email) return badRequest("student_email required");
  return runPortalAction({ action: "portal.admin.generateSpotlight", actor, data: body });
}
