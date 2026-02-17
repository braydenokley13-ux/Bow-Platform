import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  claim_code: z.string().min(3),
  reflection_note: z.string().max(2000).optional().default("")
});

export async function POST(req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error;

  const params = await ctx.params;
  const eventId = String(params.eventId || "").trim();
  if (!eventId) return badRequest("eventId is required", "MISSING_EVENT_ID");

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid event submit payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.submitEventEntry",
    actor,
    data: {
      event_id: eventId,
      claim_code: parsed.data.claim_code,
      reflection_note: parsed.data.reflection_note
    }
  });
}
