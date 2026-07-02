import { beforeAll, describe, expect, test } from "bun:test";
import { fetchAs, login, seedDemoCampaign, signupAndLogin, uniqueEmail, type TestAccount } from "../helpers/client";
import { TEST_BASE_URL } from "../setup";
import { testDb } from "../helpers/testDb";

let owner: TestAccount;
let member: TestAccount;
let campaignId: string;
let voterId: string;
let volunteerId: string;
let donorId: string;

beforeAll(async () => {
  owner = await signupAndLogin();
  campaignId = await seedDemoCampaign(owner.cookie);

  const [voters, volunteers, donors] = await Promise.all([
    fetchAs(owner.cookie, `/api/voters?campaignId=${campaignId}&limit=1`).then((r) => r.json()),
    fetchAs(owner.cookie, `/api/volunteers?campaignId=${campaignId}`).then((r) => r.json()),
    fetchAs(owner.cookie, `/api/donors?campaignId=${campaignId}`).then((r) => r.json()),
  ]);
  voterId = voters.items[0].id;
  volunteerId = volunteers.items[0].id;
  donorId = donors.items[0].id;

  // Bring `member` in as a real member (not owner) of the same campaign via
  // the actual invite flow, so member-vs-owner authorization is exercised
  // the same way a real user would experience it.
  const memberEmail = uniqueEmail("crud-member");
  const inviteRes = await fetchAs(owner.cookie, "/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaignId, email: memberEmail }),
  });
  expect(inviteRes.status).toBe(200);
  const invite = await testDb.invite.findUniqueOrThrow({
    where: { campaignId_email: { campaignId, email: memberEmail } },
  });
  const acceptRes = await fetch(`${TEST_BASE_URL}/api/invites/token/${invite.token}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Crud Member", password: "correcthorsebatterystaple1" }),
  });
  expect(acceptRes.status).toBe(200);
  const memberCookie = await login(memberEmail, "correcthorsebatterystaple1");
  member = { email: memberEmail, password: "correcthorsebatterystaple1", name: "Crud Member", campaignId, cookie: memberCookie };
});

describe("voters", () => {
  test("list is scoped to the campaign and supports filters", async () => {
    const res = await fetchAs(owner.cookie, `/api/voters?campaignId=${campaignId}&support=strong-support`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.every((v: { supportLevel: string }) => v.supportLevel === "strong-support")).toBe(true);
  });

  test("PATCH updates a voter's support level", async () => {
    const res = await fetchAs(owner.cookie, "/api/voters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: voterId, supportLevel: "lean-oppose", hasYardSign: true }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.supportLevel).toBe("lean-oppose");
    expect(updated.hasYardSign).toBe(true);
  });
});

describe("volunteers", () => {
  test("list includes activity counts", async () => {
    const res = await fetchAs(owner.cookie, `/api/volunteers?campaignId=${campaignId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.length).toBeGreaterThan(0);
  });

  test("PATCH updates status", async () => {
    const res = await fetchAs(owner.cookie, "/api/volunteers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: volunteerId, status: "inactive" }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe("inactive");
  });
});

describe("donors", () => {
  test("owner can list donors", async () => {
    const res = await fetchAs(owner.cookie, `/api/donors?campaignId=${campaignId}`);
    expect(res.status).toBe(200);
  });

  test("a member (non-owner) is forbidden from listing donors", async () => {
    const res = await fetchAs(member.cookie, `/api/donors?campaignId=${campaignId}`);
    expect(res.status).toBe(403);
  });
});

describe("events", () => {
  let eventId: string;

  test("create an event", async () => {
    const res = await fetchAs(owner.cookie, "/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Block Party",
        type: "rally",
        startTime: new Date(Date.now() + 86_400_000).toISOString(),
        campaignId,
      }),
    });
    expect(res.status).toBe(200);
    const created = await res.json();
    eventId = created.id;
    expect(created.status).toBe("scheduled");
  });

  test("list includes the created event", async () => {
    const res = await fetchAs(owner.cookie, `/api/events?campaignId=${campaignId}`);
    const body = await res.json();
    expect(body.items.some((e: { id: string }) => e.id === eventId)).toBe(true);
  });

  test("PATCH updates status", async () => {
    const res = await fetchAs(owner.cookie, "/api/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: eventId, status: "cancelled" }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe("cancelled");
  });
});

describe("tasks", () => {
  let taskId: string;

  test("create a task assigned to a volunteer", async () => {
    const res = await fetchAs(owner.cookie, "/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Knock 20 doors", campaignId, assignedVolunteerId: volunteerId }),
    });
    expect(res.status).toBe(200);
    const created = await res.json();
    taskId = created.id;
    expect(created.status).toBe("todo");
  });

  test("PATCH updates status and priority", async () => {
    const res = await fetchAs(owner.cookie, "/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: "done", priority: "urgent" }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe("done");
    expect(updated.priority).toBe("urgent");
  });
});

describe("canvass logs", () => {
  test("create and filter by outcome", async () => {
    const createRes = await fetchAs(owner.cookie, "/api/canvass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voterId,
        volunteerId,
        campaignId,
        outcome: "canvassed",
        supportLevel: "strong-support",
      }),
    });
    expect(createRes.status).toBe(200);

    const listRes = await fetchAs(owner.cookie, `/api/canvass?campaignId=${campaignId}&outcome=canvassed`);
    const body = await listRes.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((l: { outcome: string }) => l.outcome === "canvassed")).toBe(true);
  });
});

describe("call logs", () => {
  test("create and list", async () => {
    const createRes = await fetchAs(owner.cookie, "/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId, volunteerId, campaignId, outcome: "contacted", callLengthSec: 90 }),
    });
    expect(createRes.status).toBe(200);

    const listRes = await fetchAs(owner.cookie, `/api/calls?campaignId=${campaignId}`);
    const body = await listRes.json();
    expect(body.items.length).toBeGreaterThan(0);
  });
});

describe("contact claims", () => {
  test("a second volunteer cannot claim an already-claimed voter", async () => {
    const volunteers = await fetchAs(owner.cookie, `/api/volunteers?campaignId=${campaignId}`).then((r) => r.json());
    const [firstVolunteer, secondVolunteer] = volunteers.items;

    const claimRes = await fetchAs(owner.cookie, "/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId, channel: "canvass", volunteerId: firstVolunteer.id }),
    });
    expect(claimRes.status).toBe(200);

    const conflictRes = await fetchAs(owner.cookie, "/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId, channel: "canvass", volunteerId: secondVolunteer.id }),
    });
    expect(conflictRes.status).toBe(409);

    const releaseRes = await fetchAs(owner.cookie, "/api/claims", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId, channel: "canvass", volunteerId: firstVolunteer.id }),
    });
    expect(releaseRes.status).toBe(200);

    const reclaimRes = await fetchAs(owner.cookie, "/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId, channel: "canvass", volunteerId: secondVolunteer.id }),
    });
    expect(reclaimRes.status).toBe(200);
  });
});

describe("dashboard", () => {
  test("loads without error and totals are internally consistent", async () => {
    const res = await fetchAs(owner.cookie, `/api/dashboard?campaignId=${campaignId}`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.totals.voters).toBeGreaterThan(0);
    expect(body.totals.donors).toBeGreaterThan(0);

    const donationsRes = await fetchAs(owner.cookie, `/api/donations?campaignId=${campaignId}`);
    const donations = await donationsRes.json();
    expect(body.totals.donations).toBe(donations.items.length);

    const sumCents = donations.items.reduce((s: number, d: { amountCents: number }) => s + d.amountCents, 0);
    expect(body.totals.raisedCents).toBe(sumCents);

    // A member has no visibility into donation-level detail on the dashboard.
    const memberRes = await fetchAs(member.cookie, `/api/dashboard?campaignId=${campaignId}`);
    const memberBody = await memberRes.json();
    expect(memberBody.fundraising.recent).toEqual([]);
  });
});
