import { z } from "zod";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { listChatMessages, createChatMessage, moderateChatMessage } from "@/lib/chat-service";
import { isAdminRole } from "@/lib/auth-server";

const postSchema = z.object({
  text: z.string().min(1).max(1200).optional(),
  action: z.enum(["post", "moderate"]).default("post"),
  messageId: z.string().optional()
});

export async function GET(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error;

  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || 100);
    const messages = await listChatMessages(limit);
    return ok({ ok: true, data: messages });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to load chat");
  }
}

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error;

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid chat payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  try {
    if (parsed.data.action === "moderate") {
      if (!isAdminRole(actor.role)) return forbidden("Admin role required for moderation");
      if (!parsed.data.messageId) return badRequest("messageId is required for moderation");

      await moderateChatMessage(parsed.data.messageId);
      return ok({ ok: true, message: "Message moderated" });
    }

    if (!parsed.data.text) return badRequest("text is required");

    const created = await createChatMessage({
      authorEmail: actor.email,
      authorRole: actor.role,
      text: parsed.data.text.trim()
    });

    return ok({ ok: true, data: created });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Chat write failed");
  }
}
