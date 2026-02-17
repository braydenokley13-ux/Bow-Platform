import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const resolveSchema = z.object({
  resolution_note: z.string().trim().max(5000).optional().default(""),
  notify_student: z.boolean().optional().default(true)
});

export async function POST(req: Request, ctx: { params: Promise<{ ticketId: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const params = await ctx.params;
  const ticketId = String(params.ticketId || "").trim();
  if (!ticketId) return badRequest("ticketId is required", "MISSING_TICKET_ID");

  const parsed = resolveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid resolve payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.resolveSupportTicket",
    actor,
    data: {
      ticket_id: ticketId,
      resolution_note: parsed.data.resolution_note,
      notify_student: parsed.data.notify_student
    }
  });
}
