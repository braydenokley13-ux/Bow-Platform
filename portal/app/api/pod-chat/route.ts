import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const url = new URL(req.url);
  return runPortalAction({
    action: "portal.getPodChat",
    actor,
    data: { limit: Number(url.searchParams.get("limit") ?? 60), cursor: url.searchParams.get("cursor") ?? "" }
  });
}

const bodySchema = z.object({ message: z.string().min(1).max(1000) });

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid message payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({ action: "portal.sendPodChatMessage", actor, data: parsed.data });
}
