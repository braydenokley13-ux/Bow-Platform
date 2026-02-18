import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

export async function GET(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const url = new URL(req.url);
  return runPortalAction({
    action: "portal.getDiscussionThreads",
    actor,
    data: { module_id: url.searchParams.get("module_id") ?? "" }
  });
}

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  module_id: z.string().optional().default("")
});

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid thread payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({ action: "portal.createDiscussionThread", actor, data: parsed.data });
}
