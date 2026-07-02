// Preloaded once before the whole `bun test` run (see bunfig.toml). Spins up
// a dedicated test Postgres database and the real standalone production
// server against it, so integration tests exercise the actual built app —
// not a dev server, not mocked route handlers — matching how every flow in
// this app was manually verified during development.
import { existsSync } from "fs";
import { deriveTestDbUrl, ensureTestDatabase } from "./helpers/db";
import { resetTestDatabase } from "./helpers/reset";

const BASE_DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://campaignground:campaignground@localhost:55432/campaignground";
export const TEST_DATABASE_URL = deriveTestDbUrl(BASE_DATABASE_URL);

export const TEST_PORT = 3099;
export const TEST_BASE_URL = `http://localhost:${TEST_PORT}`;
export const TEST_WEBHOOK_USERNAME = "test-webhook-user";
export const TEST_WEBHOOK_PASSWORD = "test-webhook-password";

const serverEntry = "./.next/standalone/server.js";
if (!existsSync(serverEntry)) {
  throw new Error(
    "Standalone build not found at .next/standalone/server.js — run `bun run build` before " +
      "`bun test`. Integration tests run against the real production build, not the dev server."
  );
}

console.log("[test setup] preparing test database…");
await ensureTestDatabase(BASE_DATABASE_URL, TEST_DATABASE_URL);

const migrate = Bun.spawnSync({
  cmd: ["bunx", "prisma", "migrate", "deploy"],
  env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  stdout: "pipe",
  stderr: "pipe",
});
if (migrate.exitCode !== 0) {
  throw new Error(`Failed to migrate test database: ${migrate.stderr.toString()}`);
}

await resetTestDatabase(TEST_DATABASE_URL);

console.log("[test setup] starting test server on", TEST_BASE_URL, "…");
const server = Bun.spawn({
  cmd: ["bun", serverEntry],
  env: {
    ...process.env,
    DATABASE_URL: TEST_DATABASE_URL,
    NEXTAUTH_SECRET: "test-secret-not-for-production-use-only-in-tests",
    NEXTAUTH_URL: TEST_BASE_URL,
    POSTMARK_WEBHOOK_USERNAME: TEST_WEBHOOK_USERNAME,
    POSTMARK_WEBHOOK_PASSWORD: TEST_WEBHOOK_PASSWORD,
    PORT: String(TEST_PORT),
    HOSTNAME: "0.0.0.0",
    NODE_ENV: "production",
  },
  stdout: "ignore",
  stderr: "inherit",
});

async function waitForReady(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${TEST_BASE_URL}/api/health`);
      if (r.ok) return;
    } catch {
      // Not accepting connections yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Test server did not become ready in time");
}
await waitForReady();
console.log("[test setup] test server ready");

process.on("exit", () => {
  server.kill();
});
