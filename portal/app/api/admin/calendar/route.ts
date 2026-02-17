import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  event_id: z.string().optional(),
  title: z.string().min(2),
  starts_at: z.string(),
  ends_at: z.string(),
  location: z.string().default(""),
  meeting_url: z.string().default(""),
  notes: z.string().default(""),
  enabled: z.boolean().default(true)
});

export async function GET() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;
  return runPortalAction({ action: "portal.getCalendar", actor });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid event payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.upsertCalendarEvent",
    actor,
    data: parsed.data
  });
}
