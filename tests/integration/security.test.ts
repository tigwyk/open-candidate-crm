import { beforeAll, describe, expect, test } from "bun:test";
import { fetchAs, login, seedDemoCampaign, signupAndLogin, uniqueEmail, type TestAccount } from "../helpers/client";
import { TEST_BASE_URL, TEST_WEBHOOK_USERNAME, TEST_WEBHOOK_PASSWORD } from "../setup";

// Fixture: two campaigns owned by two unrelated accounts, with campaign A
// populated with real demo data (voters, donors, volunteers) to use as the
// "victim" resource ids that campaign B will attempt to reference. Built
// once via beforeAll and shared across tests in this describe block — the
// signup route itself is rate-limited per IP (5/min), and every test in this
// file runs from the same host.
let victimCampaignId: string;
let victimVoterId: string;
let victimDonorId: string;
let victimVolunteerId: string;
let attacker: TestAccount;

describe("cross-campaign IDOR protection", () => {
  beforeAll(async () => {
    const owner = await signupAndLogin();
    victimCampaignId = await seedDemoCampaign(owner.cookie);

    const [voter, donor, volunteer] = await Promise.all([
      fetchAs(owner.cookie, `/api/voters?campaignId=${victimCampaignId}&limit=1`).then((r) => r.json()),
      fetchAs(owner.cookie, `/api/donors?campaignId=${victimCampaignId}`).then((r) => r.json()),
      fetchAs(owner.cookie, `/api/volunteers?campaignId=${victimCampaignId}`).then((r) => r.json()),
    ]);
    victimVoterId = voter.items[0].id;
    victimDonorId = donor.items[0].id;
    victimVolunteerId = volunteer.items[0].id;

    attacker = await signupAndLogin();
  });

  test("POST /api/donations rejects a donorId from another campaign", async () => {
    const res = await fetchAs(attacker.cookie, "/api/donations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountCents: 1000,
        donorId: victimDonorId,
        campaignId: attacker.campaignId,
      }),
    });

    expect(res.status).toBe(400);
  });

  test("POST /api/canvass rejects a voterId from another campaign", async () => {
    const res = await fetchAs(attacker.cookie, "/api/canvass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voterId: victimVoterId,
        volunteerId: victimVolunteerId,
        campaignId: attacker.campaignId,
        outcome: "canvassed",
      }),
    });

    expect(res.status).toBe(400);
  });

  test("POST /api/calls rejects a voterId from another campaign", async () => {
    const res = await fetchAs(attacker.cookie, "/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voterId: victimVoterId,
        volunteerId: victimVoterId,
        campaignId: attacker.campaignId,
        outcome: "contacted",
      }),
    });

    expect(res.status).toBe(400);
  });

  test("POST /api/tasks rejects an assignedVolunteerId from another campaign", async () => {
    const res = await fetchAs(attacker.cookie, "/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Steal a volunteer",
        campaignId: attacker.campaignId,
        assignedVolunteerId: victimVolunteerId,
      }),
    });

    expect(res.status).toBe(400);
  });

  test("POST /api/claims rejects a volunteerId from another campaign", async () => {
    // Attacker's campaign is blank (signup, no seed) — seed it so there's a
    // real voter of their own to attempt the claim against.
    const attackerCampaignId = await seedDemoCampaign(attacker.cookie);
    const seededVoters = await fetchAs(
      attacker.cookie,
      `/api/voters?campaignId=${attackerCampaignId}&limit=1`
    ).then((r) => r.json());

    const res = await fetchAs(attacker.cookie, "/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voterId: seededVoters.items[0].id,
        channel: "call",
        volunteerId: victimVolunteerId,
      }),
    });

    expect(res.status).toBe(400);
  });

  test("GET /api/donations rejects a campaignId the caller has no membership in", async () => {
    const res = await fetchAs(attacker.cookie, `/api/donations?campaignId=${victimCampaignId}`);

    expect(res.status).toBe(403);
  });
});

describe("login brute-force rate limiting", () => {
  test("locks out further attempts (even with the correct password) after repeated failures", async () => {
    const email = uniqueEmail();
    const password = "correcthorsebatterystaple1";
    await signupAndLogin({ email, password });

    // login:<email> is capped at 10 attempts per 15-minute window (see
    // src/lib/auth.ts) — exhaust it with wrong-password attempts.
    for (let i = 0; i < 10; i++) {
      await login(email, "definitely-wrong-password");
    }

    // The 11th attempt is blocked by the rate limiter itself, even though
    // the password this time is correct.
    const cookie = await login(email, password);
    const res = await fetchAs(cookie, "/api/memberships", { redirect: "manual" });

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
  });
});

describe("bounce webhook auth", () => {
  const url = `${TEST_BASE_URL}/api/webhooks/postmark/bounce`;

  test("rejects requests with no Authorization header", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  test("rejects requests with the wrong Basic Auth credentials", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from("wrong:creds").toString("base64")}`,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  test("accepts requests with the correct Basic Auth credentials", async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${TEST_WEBHOOK_USERNAME}:${TEST_WEBHOOK_PASSWORD}`).toString("base64")}`,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
  });
});
