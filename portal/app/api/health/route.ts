import { ok } from "@/lib/api-response";
import { portalAction } from "@/lib/portal-actions";
import { env } from "@/lib/env";
import type { PortalActor } from "@/types/portal";

function healthActor(): PortalActor {
  return {
    email: String(process.env.HEALTHCHECK_ACTOR_EMAIL || process.env.DEV_ACTOR_EMAIL || "healthcheck@bowsportscapital.com").toLowerCase(),
    role: "ADMIN"
  };
}

export async function GET() {
  const checks = {
    apps_script_url_configured: Boolean(env.appsScript.url),
    apps_script_secret_configured: Boolean(env.appsScript.sharedSecret),
    firebase_project_configured: Boolean(env.firebaseAdmin.projectId)
  };

  try {
    const health = await portalAction<unknown>("portal.getHealth", healthActor(), {});
    return ok({
      ok: true,
      status: "HEALTHY",
      ts: new Date().toISOString(),
      checks,
      backend: health
    });
  } catch (err) {
    return ok({
      ok: false,
      status: "DEGRADED",
      ts: new Date().toISOString(),
      checks,
      error: err instanceof Error ? err.message : "Health check failed"
    });
  }
}
