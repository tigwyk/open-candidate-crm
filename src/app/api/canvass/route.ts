import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireCampaignAccess } from "@/lib/api-auth";
import { parseBody, parseQuery } from "@/lib/api-validate";
import { paginationSchema } from "@/lib/validation/shared";
import { canvassCreateSchema } from "@/lib/validation/canvass";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const outcome = sp.get("outcome");
  const precinctId = sp.get("precinctId");
  const pagination = parseQuery(sp, paginationSchema);
  if ("error" in pagination) return pagination.error;
  const { limit } = pagination.data;
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
  const parsed = await parseBody(req, canvassCreateSchema);
  if ("error" in parsed) return parsed.error;
  const { voterId, householdId, volunteerId, campaignId, outcome, supportLevel, yardSign, issuePriority, notes } = parsed.data;
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
