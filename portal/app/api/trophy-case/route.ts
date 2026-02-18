import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const url = new URL(req.url);
  const studentEmail = url.searchParams.get("student_email") ?? "";
  return runPortalAction({
    action: "portal.getTrophyCase",
    actor,
    data: { student_email: studentEmail }
  });
}
