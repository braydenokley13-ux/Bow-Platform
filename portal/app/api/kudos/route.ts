import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const url = new URL(req.url);
  return runPortalAction({
    action: "portal.getKudos",
    actor,
    data: { limit: Number(url.searchParams.get("limit") ?? 50), cursor: url.searchParams.get("cursor") ?? "" }
  });
}

const bodySchema = z.object({
  recipient_email: z.string().email(),
  message: z.string().min(1).max(280)
});

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid shoutout payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({ action: "portal.sendShoutout", actor, data: parsed.data });
}
