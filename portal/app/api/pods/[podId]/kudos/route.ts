import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  target_email: z.string().email(),
  message: z.string().min(2).max(400)
});

export async function POST(req: Request, ctx: { params: Promise<{ podId: string }> }) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const params = await ctx.params;
  const podId = String(params.podId || "").trim();
  if (!podId) return badRequest("podId is required", "MISSING_POD_ID");

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid kudos payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.sendPodKudos",
    actor,
    data: {
      pod_id: podId,
      target_email: parsed.data.target_email,
      message: parsed.data.message
    }
  });
}
