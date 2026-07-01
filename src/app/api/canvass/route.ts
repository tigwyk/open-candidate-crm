import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireCampaignAccess } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const outcome = sp.get("outcome");
  const precinctId = sp.get("precinctId");
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "100"));
  const campaignId = sp.get("campaignId");
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const where: Prisma.CanvassLogWhereInput = { campaignId: access.campaignId };
  if (outcome) where.outcome = outcome;
  if (precinctId) where.voter = { precinctId };

  const logs = await db.canvassLog.findMany({
    where,
    orderBy: { contactedAt: "desc" },
    include: {
      voter: { select: { firstName: true, lastName: true, registeredAddress: true, precinct: { select: { name: true } } } },
      volunteer: { select: { firstName: true, lastName: true } },
      household: { select: { address: true } },
    },
    take: limit,
  });

  return NextResponse.json({
    items: logs.map((l) => ({
      ...l,
      contactedAt: l.contactedAt.toISOString(),
      createdAt: l.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { voterId, householdId, volunteerId, campaignId, outcome, supportLevel, yardSign, issuePriority, notes } = body;
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const log = await db.canvassLog.create({
    data: {
      voterId,
      householdId,
      volunteerId,
      campaignId: access.campaignId,
      outcome: outcome ?? "not-home",
      supportLevel,
      yardSign: yardSign ?? false,
      issuePriority,
      notes,
    },
  });

  // If a support level was captured, also update the voter record
  if (voterId && supportLevel) {
    await db.voter.update({
      where: { id: voterId },
      data: { supportLevel, supportLevelSource: "canvass" },
    });
  }
  if (voterId && yardSign) {
    await db.voter.update({
      where: { id: voterId },
      data: { hasYardSign: true },
    });
  }

  return NextResponse.json(log);
}
