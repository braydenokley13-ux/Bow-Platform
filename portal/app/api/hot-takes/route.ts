import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET() {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.getHotTakes", actor });
}

const bodySchema = z.object({ take: z.string().min(1).max(280) });

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid hot take payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({ action: "portal.postHotTake", actor, data: parsed.data });
}
