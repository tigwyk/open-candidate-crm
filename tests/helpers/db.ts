import { PrismaClient } from "@prisma/client";

// Derives a dedicated test database URL from whatever DATABASE_URL is
// configured (local dev Postgres or a CI service container) by appending
// `_test` to the database name — tests never run against real dev/prod data.
export function deriveTestDbUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (!url.pathname.endsWith("_test")) {
    url.pathname = `${url.pathname}_test`;
  }
  return url.toString();
}

// Creates the test database if it doesn't already exist. Connects to the
// admin `postgres` database to issue CREATE DATABASE, since you can't run
// that command while connected to the database being created.
export async function ensureTestDatabase(baseUrl: string, testUrl: string): Promise<void> {
  const testDbName = new URL(testUrl).pathname.replace(/^\//, "");
  const adminUrl = new URL(baseUrl);
  adminUrl.pathname = "/postgres";

  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
  } catch (e) {
    // 42P04 = database already exists — expected on repeat test runs.
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes("42P04") && !message.includes("already exists")) {
      throw e;
    }
  } finally {
    await admin.$disconnect();
  }
}
