import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireCampaignAccess } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const outcome = sp.get("outcome");
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "100"));
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
  const body = await req.json();
  const { voterId, volunteerId, campaignId, outcome, supportLevel, issuePriority, notes, callLengthSec } = body;
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

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
