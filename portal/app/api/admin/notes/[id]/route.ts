import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  const { id } = await params;
  return runPortalAction({ action: "portal.admin.deleteNote", actor, data: { note_id: id } });
}
