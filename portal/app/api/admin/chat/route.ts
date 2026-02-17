import { ok, serverError } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { listChatMessages } from "@/lib/chat-service";

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || 200);
    const data = await listChatMessages(limit);
    return ok({ ok: true, data });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Failed to load chat");
  }
}
