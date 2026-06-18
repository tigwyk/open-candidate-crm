import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const outcome = sp.get("outcome");
  const precinctId = sp.get("precinctId");
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "100"));

  const where: Prisma.CanvassLogWhereInput = {};
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
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const log = await db.canvassLog.create({
    data: {
      voterId,
      householdId,
      volunteerId,
      campaignId,
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
      data: { supportLevel },
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
