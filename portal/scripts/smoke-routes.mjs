import { spawn } from "node:child_process";

const managedServer = !process.env.SMOKE_BASE_URL;
const port = process.env.SMOKE_PORT || "3101";
const baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`;

const devActorEmail = process.env.NEXT_PUBLIC_DEV_ACTOR_EMAIL || "";
const devActorRole = process.env.NEXT_PUBLIC_DEV_ACTOR_ROLE || "ADMIN";

const devHeaders = devActorEmail
  ? {
      "x-dev-actor-email": devActorEmail,
      "x-dev-actor-role": devActorRole
    }
  : {};

/** @type {import('node:child_process').ChildProcessWithoutNullStreams | null} */
let server = null;
let serverLogs = "";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(url, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, { redirect: "follow" });
      if (response.status < 500) {
        return;
      }
    } catch {
      // server is still booting
    }
    await sleep(500);
  }
  throw new Error(`Server did not become ready at ${url}`);
}

function startServer() {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  server = spawn(
    npmCmd,
    ["run", "start", "--", "--hostname", "127.0.0.1", "--port", port],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    }
  );

  server.stdout.on("data", (chunk) => {
    serverLogs += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    serverLogs += String(chunk);
  });
}

async function stopServer() {
  if (!server) return;

  const proc = server;
  server = null;

  proc.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => proc.once("exit", resolve)),
    sleep(2500)
  ]);

  if (proc.exitCode === null) {
    proc.kill("SIGKILL");
  }
}

async function getText(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "follow",
    ...options
  });
  const body = await response.text();
  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runChecks() {
  const checks = [
    {
      name: "login route renders",
      run: async () => {
        const { response, body } = await getText("/login");
        assert(response.ok, `Expected /login to return 2xx, received ${response.status}`);
        assert(/sign\s*in|login|welcome/i.test(body), "Expected login UI text on /login response");
      }
    },
    {
      name: "home route responds",
      run: async () => {
        const { response, body } = await getText("/home");
        assert(response.ok, `Expected /home to return 2xx, received ${response.status}`);
        assert(
          /session check|dashboard|portal|bow/i.test(body),
          "Expected home response to include portal/session content"
        );
      }
    },
    {
      name: "admin overview route responds",
      run: async () => {
        const { response, body } = await getText("/admin/overview");
        assert(response.ok, `Expected /admin/overview to return 2xx, received ${response.status}`);
        assert(
          /admin|session check|portal/i.test(body),
          "Expected admin overview response to include admin/session content"
        );
      }
    },
    {
      name: "session API responds with shape",
      run: async () => {
        const { response, body } = await getText("/api/me/session", {
          headers: devHeaders
        });
        if (!devActorEmail && response.status === 401) {
          return;
        }
        assert(response.ok, `Expected /api/me/session to return 2xx, received ${response.status}`);
        const json = JSON.parse(body);
        assert(Boolean(json?.ok), "Expected /api/me/session payload ok=true");
        assert(Boolean(json?.data?.role), "Expected /api/me/session payload to include data.role");
        assert(Boolean(json?.data?.status), "Expected /api/me/session payload to include data.status");
      }
    }
  ];

  for (const check of checks) {
    await check.run();
    console.log(`PASS: ${check.name}`);
  }
}

async function main() {
  try {
    if (managedServer) {
      startServer();
      await waitForReady(`${baseUrl}/login`);
    }

    await runChecks();
    console.log("Smoke checks passed.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Smoke checks failed: ${message}`);
    if (serverLogs.trim()) {
      console.error("--- next start logs ---");
      console.error(serverLogs.trim());
    }
    process.exitCode = 1;
  } finally {
    await stopServer();
  }
}

void main();
