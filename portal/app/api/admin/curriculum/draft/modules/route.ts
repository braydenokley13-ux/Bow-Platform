import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({}).passthrough();

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const url = new URL(req.url);
  const programId = url.searchParams.get("programId") || url.searchParams.get("program_id") || "";

  return runPortalAction({
    action: "portal.admin.getDraftModules",
    actor,
    data: {
      program_id: programId
    }
  });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid module payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.createDraftModule",
    actor,
    data: parsed.data
  });
}
