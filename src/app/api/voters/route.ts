import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireCampaignAccess } from "@/lib/api-auth";
import { parseBody, parseQuery } from "@/lib/api-validate";
import { paginationSchema } from "@/lib/validation/shared";
import { voterPatchSchema } from "@/lib/validation/voter";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const support = sp.get("support"); // comma separated
  const party = sp.get("party"); // comma separated
  const precinctId = sp.get("precinctId");
  const contactedOnly = sp.get("contacted") === "1";
  const pagination = parseQuery(sp, paginationSchema);
  if ("error" in pagination) return pagination.error;
  const { limit, offset } = pagination.data;
  const campaignId = sp.get("campaignId");
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const where: Prisma.VoterWhereInput = { campaignId: access.campaignId };
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { registeredAddress: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
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
  const parsed = await parseBody(req, voterPatchSchema);
  if ("error" in parsed) return parsed.error;
  const { id, supportLevel, notes, volunteer, hasYardSign, hasBumperSticker, tags } = parsed.data;

  const voter = await db.voter.findUnique({ where: { id }, select: { campaignId: true } });
  if (!voter) return NextResponse.json({ error: "not found" }, { status: 404 });
  const access = await requireCampaignAccess(voter.campaignId);
  if ("error" in access) return access.error;

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
