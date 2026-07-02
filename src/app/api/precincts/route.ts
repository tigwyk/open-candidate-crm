import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const precincts = await db.precinct.findMany({
    where: { campaignId: access.campaignId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { voters: true, households: true } },
    },
  });
  return NextResponse.json({ items: precincts });
}
