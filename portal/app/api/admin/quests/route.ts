import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  quest_id: z.string().optional(),
  title: z.string().min(2),
  description: z.string().optional().default(""),
  target_type: z.string().min(2),
  target_json: z.union([z.string(), z.record(z.any())]),
  reward_points: z.number().int().min(0).optional().default(0),
  reward_badge: z.string().optional().default(""),
  difficulty: z.string().optional().default("Core"),
  enabled: z.boolean().optional().default(true),
  sort_order: z.number().int().optional()
});

export async function GET() {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;
  return runPortalAction({ action: "portal.admin.listQuests", actor });
}

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid quest payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  const payload = {
    ...parsed.data,
    target_json:
      typeof parsed.data.target_json === "string"
        ? parsed.data.target_json
        : JSON.stringify(parsed.data.target_json || {})
  };

  return runPortalAction({
    action: "portal.admin.upsertQuest",
    actor,
    data: payload
  });
}
