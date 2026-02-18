import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.admin.getChangelog", actor });
}

const bodySchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  category: z.enum(["feature", "fix", "improvement", "note"]).default("feature")
});

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid changelog payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.addChangelogEntry",
    actor,
    data: parsed.data
  });
}
