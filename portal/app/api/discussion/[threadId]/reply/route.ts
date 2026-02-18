import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const { threadId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid reply payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.replyToDiscussionThread",
    actor,
    data: { thread_id: threadId, body: parsed.data.body }
  });
}
