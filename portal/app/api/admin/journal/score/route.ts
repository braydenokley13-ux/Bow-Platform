import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const scoreSchema = z.object({
  entry_id: z.string().min(3),
  score_decision_quality: z.number().min(0).max(5),
  score_financial_logic: z.number().min(0).max(5),
  score_risk_management: z.number().min(0).max(5),
  score_communication: z.number().min(0).max(5),
  coach_note: z.string().max(5000).optional().default("")
});

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = scoreSchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid journal score payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.scoreJournalEntry",
    actor,
    data: parsed.data
  });
}
