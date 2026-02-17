import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import { badRequest, ok, serverError } from "@/lib/api-response";
import { portalAction } from "@/lib/portal-actions";

const bodySchema = z.object({
  inviteId: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return badRequest("Invalid request payload", "INVALID_PAYLOAD", parsed.error.flatten());
    }

    const email = parsed.data.email.toLowerCase();

    let user;
    try {
      user = await adminAuth().getUserByEmail(email);
      await adminAuth().updateUser(user.uid, { password: parsed.data.password });
    } catch {
      user = await adminAuth().createUser({ email, password: parsed.data.password, emailVerified: true });
    }

    const activation = await portalAction<{ role: string; status: string }>(
      "portal.activateInvite",
      { email, role: "STUDENT" },
      {
        invite_id: parsed.data.inviteId,
        email,
        firebase_uid: user.uid
      }
    );

    await adminAuth().setCustomUserClaims(user.uid, {
      role: String(activation.role || "STUDENT").toUpperCase()
    });

    return ok({
      ok: true,
      user: {
        uid: user.uid,
        email,
        role: activation.role,
        status: activation.status
      }
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Activation failed");
  }
}
