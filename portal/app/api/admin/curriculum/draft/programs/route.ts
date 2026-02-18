import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({}).passthrough();

export async function GET() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  return runPortalAction({ action: "portal.admin.getDraftPrograms", actor });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid program payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.createDraftProgram",
    actor,
    data: parsed.data
  });
}
