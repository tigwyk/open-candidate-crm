import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformOwner } from "@/lib/api-auth";

// GET /api/platform/users — read-only, deployment-wide list of every user
// and what they have access to, for the platform owner's admin view.
export async function GET() {
  const access = await requirePlatformOwner();
  if ("error" in access) return access.error;

  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      memberships: {
        include: { campaign: { select: { candidateName: true } } },
      },
    },
  });

  return NextResponse.json({
    items: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isPlatformOwner: u.isPlatformOwner,
      createdAt: u.createdAt.toISOString(),
      memberships: u.memberships.map((m) => ({
        campaignName: m.campaign.candidateName,
        role: m.role,
      })),
    })),
  });
}
