import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import { env } from "@/lib/env";
import { badRequest, ok, serverError } from "@/lib/api-response";

const bodySchema = z.object({
  email: z.string().email()
});

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return badRequest("Invalid request payload", "INVALID_PAYLOAD", parsed.error.flatten());
    }

    const email = parsed.data.email.toLowerCase();

    // Never reveal account existence.
    try {
      await adminAuth().generatePasswordResetLink(email, {
        url: `${env.portalBaseUrl}/login`
      });
    } catch {
      // swallow
    }

    return ok({ ok: true, message: "If your account exists, a reset link has been sent." });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Reset request failed");
  }
}
