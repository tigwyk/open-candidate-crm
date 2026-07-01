import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const donorId = sp.get("donorId");
  const where: Prisma.DonationWhereInput = {};
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
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { amountCents, donorId, campaignId, method, donationDate, inKindDescription, complianceVerified, notes } = body;
  if (!amountCents || !donorId) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  let cid = campaignId;
  if (!cid) {
    const c = await db.campaign.findFirst({ orderBy: { createdAt: "asc" } });
    if (!c) return NextResponse.json({ error: "no campaign" }, { status: 400 });
    cid = c.id;
  }
  const donation = await db.donation.create({
    data: {
      amountCents,
      donorId,
      campaignId: cid,
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
