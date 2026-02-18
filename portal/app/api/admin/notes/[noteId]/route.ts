import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";
import { unauthorized } from "@/lib/api-response";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error ?? unauthorized();

  const { noteId } = await params;

  return runPortalAction({
    action: "portal.admin.deleteStudentNote",
    actor,
    data: { note_id: noteId }
  });
}
