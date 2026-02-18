import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const { id } = await params;
  return runPortalAction({
    action: "portal.consumeDeepDiveLink",
    actor,
    data: { link_id: id }
  });
}
