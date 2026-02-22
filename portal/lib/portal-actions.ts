import { callAppsScriptAction } from "@/lib/apps-script";
import type { PortalActor } from "@/types/portal";

export async function portalAction<T>(action: string, actor: PortalActor, data?: unknown, opts?: { timeoutMs?: number }) {
  const result = await callAppsScriptAction<T>({ action, actor, data, timeoutMs: opts?.timeoutMs });
  if (!result.ok) {
    const err = new Error(result.message);
    (err as Error & { code?: string; details?: unknown }).code = result.code;
    (err as Error & { code?: string; details?: unknown }).details = result.data;
    throw err;
  }
  return result.data;
}
