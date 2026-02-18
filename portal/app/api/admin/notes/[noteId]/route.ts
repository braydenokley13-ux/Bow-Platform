import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const { noteId } = await params;

  return runPortalAction({
    action: "portal.admin.deleteStudentNote",
    actor,
    data: { note_id: noteId }
  });
}
