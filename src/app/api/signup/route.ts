import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { parseBody } from "@/lib/api-validate";
import { signupSchema } from "@/lib/validation/signup";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// POST /api/signup — public, open self-service signup. Creates a brand-new
// User plus a blank Campaign (no demo data) with that user as owner.
export async function POST(req: NextRequest) {
  const ip = getClientIp(await headers());
  if (!checkRateLimit(`signup:${ip}`, { max: 5, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const maxUsers = process.env.MAX_USERS ? parseInt(process.env.MAX_USERS, 10) : null;
  if (maxUsers !== null && !Number.isNaN(maxUsers)) {
    const count = await db.user.count();
    if (count >= maxUsers) {
      return NextResponse.json({ error: "Signups are currently closed" }, { status: 403 });
    }
  }

  const parsed = await parseBody(req, signupSchema);
  if ("error" in parsed) return parsed.error;
  const {
    name,
    email,
    password,
    candidateName,
    officeSought,
    district,
    party,
    electionDate,
    voteGoal,
    fundraisingGoalCents,
  } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, passwordHash, name } });
    const campaign = await tx.campaign.create({
      data: {
        candidateName,
        officeSought,
        district,
        party,
        electionDate: new Date(electionDate),
        voteGoal: voteGoal ?? 0,
        fundraisingGoalCents: fundraisingGoalCents ?? 0,
      },
    });
    await tx.campaignMembership.create({
      data: { userId: user.id, campaignId: campaign.id, role: "owner" },
    });
  });

  return NextResponse.json({ ok: true });
}
