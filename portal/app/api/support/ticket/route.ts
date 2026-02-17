import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const supportTicketSchema = z.object({
  category: z.string().trim().min(2).max(40),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(5).max(5000),
  page_context: z.string().trim().max(200).optional().default("")
});

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const parsed = supportTicketSchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid support ticket payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({ action: "portal.createSupportTicket", actor, data: parsed.data });
}
