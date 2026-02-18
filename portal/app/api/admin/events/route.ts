import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  event_id: z.string().optional(),
  season_id: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional().default(""),
  track: z.string().optional().default(""),
  module: z.string().optional().default(""),
  open_at: z.string().optional(),
  close_at: z.string().optional(),
  rules_json: z.union([z.string(), z.record(z.any())]).optional().default("{}"),
  status: z.string().optional().default("ACTIVE")
});

export async function GET(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  const url = new URL(req.url);
  return runPortalAction({
    action: "portal.admin.listEvents",
    actor,
    data: {
      season_id: url.searchParams.get("season_id") || ""
    }
  });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid event payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  const payload = {
    ...parsed.data,
    rules_json:
      typeof parsed.data.rules_json === "string"
        ? parsed.data.rules_json
        : JSON.stringify(parsed.data.rules_json || {})
  };

  return runPortalAction({
    action: "portal.admin.upsertEvent",
    actor,
    data: payload
  });
}
