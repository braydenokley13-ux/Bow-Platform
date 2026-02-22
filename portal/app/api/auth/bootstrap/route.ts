import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import { badRequest, forbidden, ok, serverError } from "@/lib/api-response";
import { portalAction } from "@/lib/portal-actions";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  secret: z.string().min(1)
});

export async function POST(req: Request) {
  // This endpoint is disabled unless BOOTSTRAP_SECRET is set in env.
  const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
  if (!bootstrapSecret) {
    return forbidden("Bootstrap is not enabled. Set BOOTSTRAP_SECRET in environment variables.");
  }

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return badRequest("Invalid request payload", "INVALID_PAYLOAD", parsed.error.flatten());
    }

    if (parsed.data.secret !== bootstrapSecret) {
      return forbidden("Invalid bootstrap secret.");
    }

    const email = parsed.data.email.toLowerCase();

    let user;
    try {
      user = await adminAuth().getUserByEmail(email);
      await adminAuth().updateUser(user.uid, { password: parsed.data.password });
    } catch {
      user = await adminAuth().createUser({ email, password: parsed.data.password, emailVerified: true });
    }

    // Retry up to 3 times to survive Apps Script cold-starts.
    // If a retry gets BOOTSTRAP_LOCKED, the first attempt succeeded but its
    // HTTP response was lost — treat that as success and continue.
    const MAX_RETRIES = 3;
    let lastError: unknown;
    let bootstrapOk = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await portalAction(
          "portal.bootstrap",
          { email, role: "ADMIN" },
          { email, firebase_uid: user.uid },
          { timeoutMs: 30000 }
        );
        bootstrapOk = true;
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("BOOTSTRAP_LOCKED")) {
          if (attempt > 1) {
            // First call succeeded but response was lost; treat as success.
            bootstrapOk = true;
          }
          // If first attempt got BOOTSTRAP_LOCKED, propagate it as a real error.
          lastError = err;
          break;
        }
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }

    if (!bootstrapOk) {
      throw lastError;
    }

    await adminAuth().setCustomUserClaims(user.uid, { role: "ADMIN" });

    return ok({ ok: true, email, role: "ADMIN" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Bootstrap failed";
    if (msg.includes("BOOTSTRAP_LOCKED")) {
      return forbidden("An admin already exists. Remove BOOTSTRAP_SECRET from your environment to keep bootstrap disabled.");
    }
    return serverError(msg);
  }
}
