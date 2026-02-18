import { z } from "zod";
import { badRequest } from "@/lib/api-response";
import { env } from "@/lib/env";
import { requireAdminActor } from "@/lib/route-auth";
import { runPortalAction } from "@/lib/portal-route";

const bodySchema = z.object({
  email: z.string().email(),
  role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]).default("STUDENT")
});

export async function POST(req: Request) {
  const { actor, error } = await requireAdminActor();
  if (error || !actor) return error!;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return badRequest("Invalid invite payload", "INVALID_PAYLOAD", parsed.error.flatten());
  }

  return runPortalAction({
    action: "portal.admin.createInvite",
    actor,
    data: {
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      activation_url_base: `${env.portalBaseUrl}/activate`
    }
  });
}
