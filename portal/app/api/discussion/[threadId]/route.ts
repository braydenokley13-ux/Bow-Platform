import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const { threadId } = await params;
  return runPortalAction({ action: "portal.getDiscussionThread", actor, data: { thread_id: threadId } });
}
