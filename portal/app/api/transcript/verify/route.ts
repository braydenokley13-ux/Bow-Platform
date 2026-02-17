import { badRequest, ok, serverError } from "@/lib/api-response";
import { portalAction } from "@/lib/portal-actions";
import type { PortalActor } from "@/types/portal";

function verifierActor(): PortalActor {
  return {
    email: String(process.env.TRANSCRIPT_VERIFY_ACTOR_EMAIL || process.env.DEV_ACTOR_EMAIL || "verifier@bowsportscapital.com").toLowerCase(),
    role: "ADMIN"
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const transcriptId = String(url.searchParams.get("transcript_id") || url.searchParams.get("id") || "").trim();
  if (!transcriptId) return badRequest("transcript_id is required", "MISSING_TRANSCRIPT_ID");

  try {
    const data = await portalAction("portal.verifyStrategicTranscript", verifierActor(), {
      transcript_id: transcriptId
    });
    return ok({ ok: true, data });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : "Transcript verification failed");
  }
}
