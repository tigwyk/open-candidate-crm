import { describe, expect, test } from "bun:test";
import { paginationSchema } from "@/lib/validation/shared";
import { signupSchema, passwordSchema } from "@/lib/validation/signup";
import { createInviteSchema, acceptInviteNewUserSchema } from "@/lib/validation/invite";
import { donationCreateSchema } from "@/lib/validation/donation";
import { voterPatchSchema } from "@/lib/validation/voter";
import { transferPlatformOwnerSchema } from "@/lib/validation/platform";
import { claimBodySchema } from "@/lib/validation/claim";
import { taskCreateSchema, taskPatchSchema } from "@/lib/validation/task";

const validSignup = {
  name: "Jordan Avery",
  email: "jordan@example.com",
  password: "correcthorsebatterystaple1",
  candidateName: "Jordan Avery",
  officeSought: "City Council",
  district: "District 1",
  electionDate: "2026-11-03",
};

describe("passwordSchema", () => {
  test("rejects passwords shorter than 12 characters", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
  });

  test("accepts a 12+ character password", () => {
    expect(passwordSchema.safeParse("correcthorsebatterystaple1").success).toBe(true);
  });
});

describe("signupSchema", () => {
  test("accepts a fully valid payload", () => {
    expect(signupSchema.safeParse(validSignup).success).toBe(true);
  });

  test("rejects an invalid email", () => {
    const result = signupSchema.safeParse({ ...validSignup, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  test("rejects a missing required field", () => {
    const { candidateName, ...rest } = validSignup;
    expect(signupSchema.safeParse(rest).success).toBe(false);
  });

  test("optional fields may be omitted", () => {
    expect(signupSchema.safeParse(validSignup).success).toBe(true);
  });

  test("rejects a negative voteGoal", () => {
    const result = signupSchema.safeParse({ ...validSignup, voteGoal: -5 });
    expect(result.success).toBe(false);
  });
});

describe("paginationSchema", () => {
  test("defaults limit and offset when omitted", () => {
    const result = paginationSchema.parse({});
    expect(result).toEqual({ limit: 100, offset: 0 });
  });

  test("coerces string query-param values to numbers", () => {
    const result = paginationSchema.parse({ limit: "25", offset: "10" });
    expect(result).toEqual({ limit: 25, offset: 10 });
  });

  test("rejects a limit above the max of 200", () => {
    expect(paginationSchema.safeParse({ limit: 500 }).success).toBe(false);
  });

  test("rejects a negative offset", () => {
    expect(paginationSchema.safeParse({ offset: -1 }).success).toBe(false);
  });
});

describe("createInviteSchema", () => {
  test("accepts a valid campaignId + email", () => {
    expect(createInviteSchema.safeParse({ campaignId: "c1", email: "a@b.com" }).success).toBe(true);
  });

  test("rejects an empty campaignId", () => {
    expect(createInviteSchema.safeParse({ campaignId: "", email: "a@b.com" }).success).toBe(false);
  });
});

describe("acceptInviteNewUserSchema", () => {
  test("rejects a short password", () => {
    const result = acceptInviteNewUserSchema.safeParse({ name: "A", password: "short" });
    expect(result.success).toBe(false);
  });
});

describe("donationCreateSchema", () => {
  const validDonation = { amountCents: 5000, donorId: "d1", campaignId: "c1" };

  test("accepts a valid donation", () => {
    expect(donationCreateSchema.safeParse(validDonation).success).toBe(true);
  });

  test("rejects a zero or negative amount", () => {
    expect(donationCreateSchema.safeParse({ ...validDonation, amountCents: 0 }).success).toBe(false);
    expect(donationCreateSchema.safeParse({ ...validDonation, amountCents: -100 }).success).toBe(false);
  });

  test("rejects a non-integer amount", () => {
    expect(donationCreateSchema.safeParse({ ...validDonation, amountCents: 12.5 }).success).toBe(false);
  });

  test("rejects an invalid method", () => {
    const result = donationCreateSchema.safeParse({ ...validDonation, method: "bitcoin" });
    expect(result.success).toBe(false);
  });
});

describe("voterPatchSchema", () => {
  test("requires an id", () => {
    expect(voterPatchSchema.safeParse({ supportLevel: "undecided" }).success).toBe(false);
  });

  test("rejects an invalid supportLevel", () => {
    const result = voterPatchSchema.safeParse({ id: "v1", supportLevel: "very-mad" });
    expect(result.success).toBe(false);
  });

  test("accepts a partial patch", () => {
    expect(voterPatchSchema.safeParse({ id: "v1", hasYardSign: true }).success).toBe(true);
  });
});

describe("transferPlatformOwnerSchema", () => {
  test("rejects a non-email string", () => {
    expect(transferPlatformOwnerSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("claimBodySchema", () => {
  const validClaim = { voterId: "v1", channel: "call", volunteerId: "vol1" };

  test("accepts a valid claim", () => {
    expect(claimBodySchema.safeParse(validClaim).success).toBe(true);
  });

  test("rejects an invalid channel", () => {
    expect(claimBodySchema.safeParse({ ...validClaim, channel: "email" }).success).toBe(false);
  });
});

describe("taskCreateSchema / taskPatchSchema", () => {
  test("create requires a title and campaignId", () => {
    expect(taskCreateSchema.safeParse({ campaignId: "c1" }).success).toBe(false);
    expect(taskCreateSchema.safeParse({ title: "Call voters" }).success).toBe(false);
  });

  test("create accepts a minimal valid payload", () => {
    expect(taskCreateSchema.safeParse({ title: "Call voters", campaignId: "c1" }).success).toBe(true);
  });

  test("patch rejects an invalid status", () => {
    const result = taskPatchSchema.safeParse({ id: "t1", status: "someday" });
    expect(result.success).toBe(false);
  });

  test("patch accepts a status-only update", () => {
    expect(taskPatchSchema.safeParse({ id: "t1", status: "done" }).success).toBe(true);
  });
});
