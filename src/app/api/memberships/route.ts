import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const access = await requireUser();
  if ("error" in access) return access.error;

  const [memberships, user] = await Promise.all([
    db.campaignMembership.findMany({
      where: { userId: access.userId },
      include: { campaign: { select: { candidateName: true, officeSought: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.user.findUnique({ where: { id: access.userId }, select: { isPlatformOwner: true } }),
  ]);

  return NextResponse.json({
    items: memberships.map((m) => ({
      campaignId: m.campaignId,
      campaignName: m.campaign.candidateName,
      officeSought: m.campaign.officeSought,
      role: m.role,
    })),
    isPlatformOwner: user?.isPlatformOwner ?? false,
  });
}
