import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  const { id } = await params;
  return runPortalAction({ action: "portal.admin.deleteAnnouncement", actor, data: { announcement_id: id } });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  const { id } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { body = {}; }
  return runPortalAction({ action: "portal.admin.upsertAnnouncement", actor, data: { ...(body as object), announcement_id: id } });
}
