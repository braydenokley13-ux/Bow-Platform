import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function POST(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const { id } = await ctx.params;
  return runPortalAction({
    action: "portal.admin.runAction",
    actor,
    data: { action_id: id }
  });
}
