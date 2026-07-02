import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformOwner } from "@/lib/api-auth";

// GET /api/platform/campaigns — read-only, deployment-wide list of every
// campaign, for the platform owner's cross-campaign admin view.
export async function GET() {
  const access = await requirePlatformOwner();
  if ("error" in access) return access.error;

  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      memberships: {
        where: { role: "owner" },
        include: { user: { select: { name: true, email: true } } },
        take: 1,
      },
      _count: { select: { memberships: true } },
    },
  });

  return NextResponse.json({
    items: campaigns.map((c) => ({
      id: c.id,
      candidateName: c.candidateName,
      officeSought: c.officeSought,
      district: c.district,
      createdAt: c.createdAt.toISOString(),
      memberCount: c._count.memberships,
      owner: c.memberships[0]?.user ?? null,
    })),
  });
}
