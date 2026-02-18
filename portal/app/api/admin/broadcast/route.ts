import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  kind: z.enum(["INFO", "QUEST", "SUPPORT", "CLAIM", "RAFFLE", "EVENT", "JOURNAL", "ACCOUNT", "POD", "ASSIGNMENT"]).optional()
});

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.broadcastMessage",
    actor,
    data: parsed.data
  });
}
