import { requireActor } from "@/lib/route-auth";
import { ok, serverError } from "@/lib/api-response";
import { hasPortalBackendConfig } from "@/lib/env";
import { portalAction } from "@/lib/portal-actions";
import type { PortalActor } from "@/types/portal";

interface SessionData {
  email: string;
  role: string;
  status: string;
}

function fallbackSession(actor: PortalActor): SessionData {
  return {
    email: actor.email,
    role: actor.role,
    status: "ACTIVE"
  };
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Session verification failed";
}

function errorCode(err: unknown) {
  if (!err || typeof err !== "object") return "";
  if (!("code" in err)) return "";
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

function isTransientAppsScriptFailure(err: unknown) {
  const message = errorMessage(err);
  return /timeout|aborted|fetch failed|network|socket|econn|etimedout|eai_again|enotfound|apps script http 5\d\d/i.test(
    message
  );
}

export async function GET() {
  const { actor, error } = await requireActor();
  if (error || !actor) return error!;

  if (!hasPortalBackendConfig()) {
    return ok({
      ok: true,
      data: fallbackSession(actor)
    });
  }

  try {
    const data = await portalAction<SessionData>("portal.getSession", actor);
    return ok({
      ok: true,
      data
    });
  } catch (err) {
    if (isTransientAppsScriptFailure(err)) {
      console.warn("Session check degraded to Firebase-only fallback:", errorMessage(err));
      return ok({
        ok: true,
        data: fallbackSession(actor)
      });
    }

    const code = errorCode(err);
    const message = errorMessage(err);
    return serverError(code ? `${message} (code: ${code})` : message);
  }
}
