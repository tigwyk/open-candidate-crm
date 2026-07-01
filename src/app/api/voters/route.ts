import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const support = sp.get("support"); // comma separated
  const party = sp.get("party"); // comma separated
  const precinctId = sp.get("precinctId");
  const contactedOnly = sp.get("contacted") === "1";
  const limit = Math.min(200, parseInt(sp.get("limit") ?? "100"));
  const offset = parseInt(sp.get("offset") ?? "0");

  const where: Prisma.VoterWhereInput = {};
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { registeredAddress: { contains: q } },
      { notes: { contains: q } },
    ];
  }
  if (support) {
    where.supportLevel = { in: support.split(",") };
  }
  if (party) {
    where.partyAffiliation = { in: party.split(",") };
  }
  if (precinctId) {
    where.precinctId = precinctId;
  }
  if (contactedOnly) {
    where.OR = [
      { callLogs: { some: { outcome: "contacted" } } },
      { canvassLogs: { some: { outcome: "canvassed" } } },
    ];
  }

  const [voters, total] = await Promise.all([
    db.voter.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: limit,
      skip: offset,
      include: {
        precinct: { select: { name: true, code: true } },
        household: { select: { address: true } },
        _count: {
          select: { callLogs: true, canvassLogs: true, donations: true },
        },
      },
    }),
    db.voter.count({ where }),
  ]);

  return NextResponse.json({
    items: voters,
    total,
    offset,
    limit,
  });
}

export async function PATCH(req: NextRequest) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { id, supportLevel, notes, volunteer, hasYardSign, hasBumperSticker, tags } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Prisma.VoterUpdateInput = {};
  if (supportLevel) {
    data.supportLevel = supportLevel;
    data.supportLevelSource = "manual";
  }
  if (notes !== undefined) data.notes = notes;
  if (volunteer !== undefined) data.volunteer = volunteer;
  if (hasYardSign !== undefined) data.hasYardSign = hasYardSign;
  if (hasBumperSticker !== undefined) data.hasBumperSticker = hasBumperSticker;
  if (tags !== undefined) data.tags = tags;

  const updated = await db.voter.update({ where: { id }, data });
  return NextResponse.json(updated);
}
