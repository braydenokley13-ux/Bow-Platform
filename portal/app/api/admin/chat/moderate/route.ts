import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { moderateChatMessage } from "@/lib/chat-service";

const bodySchema = z.object({
  messageId: z.string().min(4)
});

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  await moderateChatMessage(parsed.data.messageId);
  return Response.json({ ok: true, message: "Message moderated" });
}
