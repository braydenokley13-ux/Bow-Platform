import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET() {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.me.getNotificationPreferences", actor });
}

const bodySchema = z.object({
  shoutouts: z.boolean().optional(),
  assignments: z.boolean().optional(),
  leaderboard_changes: z.boolean().optional(),
  instructor_announcements: z.boolean().optional(),
  session_recaps: z.boolean().optional()
});

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid preferences payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.me.setNotificationPreferences",
    actor,
    data: parsed.data
  });
}
