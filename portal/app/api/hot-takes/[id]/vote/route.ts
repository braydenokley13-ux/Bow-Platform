import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({ vote: z.enum(["agree", "disagree"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid vote payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.voteHotTake",
    actor,
    data: { take_id: id, vote: parsed.data.vote }
  });
}
