import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email") ?? "";
  if (!email) return badRequest("email query param is required", "MISSING_EMAIL");

  return runPortalAction({
    action: "portal.admin.getStudentPreview",
    actor,
    data: { email }
  });
}
