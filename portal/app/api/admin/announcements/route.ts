import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  announcement_id: z.string().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  show_at: z.string().optional(),
  auto_hide_at: z.string().optional(),
  status: z.string().optional()
});

export async function GET() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;
  return runPortalAction({ action: "portal.admin.listAnnouncements", actor });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.upsertAnnouncement",
    actor,
    data: parsed.data
  });
}
