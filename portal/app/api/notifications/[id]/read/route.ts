import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;
  const { id } = await params;
  return runPortalAction({
    action: "portal.markNotificationRead",
    actor,
    data: { notification_id: id }
  });
}
