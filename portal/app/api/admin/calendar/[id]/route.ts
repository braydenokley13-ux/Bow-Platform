import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const patchSchema = z.object({
  title: z.string().min(2).optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  kind: z.string().optional(),
  location: z.string().optional(),
  meeting_url: z.string().optional(),
  notes: z.string().optional(),
  enabled: z.boolean().optional()
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid calendar event payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.upsertCalendarEvent",
    actor,
    data: { event_id: id, ...parsed.data }
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const { id } = await params;
  return runPortalAction({
    action: "portal.admin.deleteCalendarEvent",
    actor,
    data: { event_id: id }
  });
}
