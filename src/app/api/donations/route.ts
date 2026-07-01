import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireCampaignAccess } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const donorId = sp.get("donorId");
  const campaignId = sp.get("campaignId");
  const access = await requireCampaignAccess(campaignId, { role: "owner" });
  if ("error" in access) return access.error;

  const where: Prisma.DonationWhereInput = { campaignId: access.campaignId };
  if (donorId) where.donorId = donorId;

  const donations = await db.donation.findMany({
    where,
    orderBy: { donationDate: "desc" },
    include: { donor: true },
    take: 200,
  });

  return NextResponse.json({
    items: donations.map((d) => ({
      ...d,
      donationDate: d.donationDate.toISOString(),
      createdAt: d.createdAt.toISOString(),
      donor: d.donor
        ? {
            ...d.donor,
            createdAt: d.donor.createdAt.toISOString(),
            updatedAt: d.donor.updatedAt.toISOString(),
          }
        : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { amountCents, donorId, campaignId, method, donationDate, inKindDescription, complianceVerified, notes } = body;
  if (!amountCents || !donorId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const access = await requireCampaignAccess(campaignId, { role: "owner" });
  if ("error" in access) return access.error;

  const donation = await db.donation.create({
    data: {
      amountCents,
      donorId,
      campaignId: access.campaignId,
      method: method ?? "online",
      donationDate: donationDate ? new Date(donationDate) : new Date(),
      inKindDescription,
      complianceVerified: complianceVerified ?? false,
      notes,
    },
    include: { donor: true },
  });
  return NextResponse.json(donation);
}
