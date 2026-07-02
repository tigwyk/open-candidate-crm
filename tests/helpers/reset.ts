import { PrismaClient } from "@prisma/client";

// All app tables, in no particular order — TRUNCATE ... CASCADE handles FK
// dependencies regardless of listed order. Used to reset the test database
// to a clean slate before a test run, so tests never see stale data from a
// previous run.
const TABLES = [
  "User",
  "Campaign",
  "CampaignMembership",
  "Invite",
  "Precinct",
  "Household",
  "Voter",
  "Volunteer",
  "Donor",
  "Donation",
  "Event",
  "EventAttendee",
  "Task",
  "CanvassLog",
  "CallLog",
  "ContactClaim",
];

export async function resetTestDatabase(testUrl: string): Promise<void> {
  const client = new PrismaClient({ datasources: { db: { url: testUrl } } });
  try {
    const quoted = TABLES.map((t) => `"${t}"`).join(", ");
    await client.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  } finally {
    await client.$disconnect();
  }
}
