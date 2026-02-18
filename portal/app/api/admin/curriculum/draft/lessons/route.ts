import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({}).passthrough();

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const url = new URL(req.url);
  return runPortalAction({
    action: "portal.admin.getDraftLessons",
    actor,
    data: {
      program_id: url.searchParams.get("programId") || url.searchParams.get("program_id") || "",
      module_id: url.searchParams.get("moduleId") || url.searchParams.get("module_id") || ""
    }
  });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid lesson payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.createDraftLesson",
    actor,
    data: parsed.data
  });
}
