import { PrismaClient } from "@prisma/client";
import { TEST_DATABASE_URL } from "../setup";

// Read-only escape hatch for test fixtures the app deliberately never
// exposes over the API — e.g. an invite's raw token, which in production is
// only ever delivered via email. Tests still drive all real behavior (invite
// creation, acceptance) through the actual routes; this just recovers the
// one piece of data a real invitee would get from their inbox.
export const testDb = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
