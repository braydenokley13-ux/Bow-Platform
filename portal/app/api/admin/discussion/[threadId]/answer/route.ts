import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({ reply_id: z.string() });

export async function POST(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const { threadId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid answer payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.markDiscussionAnswer",
    actor,
    data: { thread_id: threadId, reply_id: parsed.data.reply_id }
  });
}
