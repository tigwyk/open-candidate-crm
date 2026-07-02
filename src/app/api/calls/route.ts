import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireCampaignAccess } from "@/lib/api-auth";
import { parseBody, parseQuery } from "@/lib/api-validate";
import { paginationSchema } from "@/lib/validation/shared";
import { callCreateSchema } from "@/lib/validation/call";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const outcome = sp.get("outcome");
  const pagination = parseQuery(sp, paginationSchema);
  if ("error" in pagination) return pagination.error;
  const { limit } = pagination.data;
  const campaignId = sp.get("campaignId");
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const where: Prisma.CallLogWhereInput = { campaignId: access.campaignId };
  if (outcome) where.outcome = outcome;

  const logs = await db.callLog.findMany({
    where,
    orderBy: { calledAt: "desc" },
    include: {
      voter: { select: { firstName: true, lastName: true, phone: true, precinct: { select: { name: true } } } },
      volunteer: { select: { firstName: true, lastName: true } },
    },
    take: limit,
  });

  return NextResponse.json({
    items: logs.map((l) => ({
      ...l,
      calledAt: l.calledAt.toISOString(),
      createdAt: l.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, callCreateSchema);
  if ("error" in parsed) return parsed.error;
  const { voterId, volunteerId, campaignId, outcome, supportLevel, issuePriority, notes, callLengthSec } = parsed.data;
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const [voter, volunteer] = await Promise.all([
    voterId ? db.voter.findFirst({ where: { id: voterId, campaignId: access.campaignId }, select: { id: true } }) : null,
    volunteerId ? db.volunteer.findFirst({ where: { id: volunteerId, campaignId: access.campaignId }, select: { id: true } }) : null,
  ]);
  if (voterId && !voter) return NextResponse.json({ error: "Invalid voter" }, { status: 400 });
  if (volunteerId && !volunteer) return NextResponse.json({ error: "Invalid volunteer" }, { status: 400 });

  const log = await db.callLog.create({
    data: {
      voterId,
      volunteerId,
      campaignId: access.campaignId,
      outcome: outcome ?? "no-answer",
      supportLevel,
      issuePriority,
      notes,
      callLengthSec: callLengthSec ?? 0,
    },
  });

  if (voterId && supportLevel) {
    await db.voter.update({
      where: { id: voterId },
      data: { supportLevel, supportLevelSource: "call" },
    });
  }

  return NextResponse.json(log);
}
