import crypto from "node:crypto";
import { env, assertPortalBackendConfigured } from "@/lib/env";
import { createRequestId } from "@/lib/request-id";
import type { PortalActionEnvelope, PortalActor } from "@/types/portal";

function signatureMessage(payload: {
  ts: number;
  requestId: string;
  action: string;
  actorEmail: string;
  data: unknown;
}) {
  return [
    String(payload.ts),
    payload.requestId,
    payload.action,
    payload.actorEmail.toLowerCase(),
    JSON.stringify(payload.data ?? {})
  ].join(".");
}

function signPayload(payload: {
  ts: number;
  requestId: string;
  action: string;
  actorEmail: string;
  data: unknown;
}): string {
  const secret = env.appsScript.sharedSecret;
  return crypto
    .createHmac("sha256", secret)
    .update(signatureMessage(payload))
    .digest("base64");
}

export async function callAppsScriptAction<TData>(args: {
  action: string;
  actor: PortalActor;
  data?: unknown;
}): Promise<PortalActionEnvelope<TData>> {
  assertPortalBackendConfigured();

  const requestId = createRequestId("portal");
  const ts = Date.now();

  const payload = {
    action: args.action,
    requestId,
    actorEmail: args.actor.email,
    actorRole: args.actor.role,
    data: args.data ?? {},
    ts,
    signature: signPayload({
      ts,
      requestId,
      action: args.action,
      actorEmail: args.actor.email,
      data: args.data ?? {}
    })
  };

  const configuredTimeout = Number(process.env.APPS_SCRIPT_TIMEOUT_MS || 20000);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 20000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(env.appsScript.url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Apps Script timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Apps Script HTTP ${res.status}`);
  }

  const json = (await res.json()) as PortalActionEnvelope<TData>;
  return json;
}
