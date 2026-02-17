import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const createSchema = z.object({
  program_id: z.string().optional().default("")
});

export async function GET() {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  return runPortalAction({
    action: "portal.getMyStrategicTranscript",
    actor
  });
}

export async function POST(req: Request) {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid transcript payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.generateStrategicTranscript",
    actor,
    data: parsed.data
  });
}
