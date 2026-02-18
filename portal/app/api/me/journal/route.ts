import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const createSchema = z.object({
  claim_code: z.string().min(3),
  program_id: z.string().optional().default(""),
  role: z.string().min(2),
  decision_text: z.string().min(5),
  rationale_text: z.string().min(5),
  outcome_text: z.string().min(5)
});

export async function GET() {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  return runPortalAction({ action: "portal.getMyJournalEntries", actor });
}

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid journal payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.createJournalEntry",
    actor,
    data: parsed.data
  });
}
