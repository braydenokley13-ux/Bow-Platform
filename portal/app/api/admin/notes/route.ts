import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";
import { badRequest } from "@/lib/api-response";

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  const url = new URL(req.url);
  const student_email = url.searchParams.get("email");
  return runPortalAction({ action: "portal.admin.getNotes", actor, data: { student_email } });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  let body: { student_email?: string; content?: string };
  try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
  if (!body.student_email) return badRequest("student_email required");
  if (!body.content?.trim()) return badRequest("content required");
  return runPortalAction({ action: "portal.admin.saveNote", actor, data: body });
}
