import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  assignment_id: z.string().optional(),
  track: z.string(),
  module: z.string(),
  title: z.string().min(2),
  description: z.string().default(""),
  due_at: z.string().optional(),
  resource_url: z.string().default(""),
  enabled: z.boolean().default(true)
});

export async function GET() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.getAssignments", actor });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid assignment payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.upsertAssignment",
    actor,
    data: parsed.data
  });
}
