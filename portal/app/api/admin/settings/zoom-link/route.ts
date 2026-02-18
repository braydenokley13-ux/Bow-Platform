import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.admin.getZoomLink", actor });
}

const bodySchema = z.object({
  url: z.string().url().or(z.literal(""))
});

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid zoom link payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.setZoomLink",
    actor,
    data: { url: parsed.data.url }
  });
}
