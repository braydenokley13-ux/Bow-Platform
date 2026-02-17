import { requireActor } from "@/lib/route-auth";
import { readJsonBody } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error;

  const { id } = await ctx.params;
  const body = await readJsonBody<{ notes?: string }>(req);
  if (body.error) return body.error;

  return runPortalAction({
    action: "portal.markAssignmentComplete",
    actor,
    data: {
      assignment_id: id,
      notes: body.data?.notes || ""
    }
  });
}
