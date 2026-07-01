import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireCampaignAccess } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const capacity = sp.get("capacity");
  const type = sp.get("type");
  const q = sp.get("q") ?? "";
  const campaignId = sp.get("campaignId");
  const access = await requireCampaignAccess(campaignId, { role: "owner" });
  if ("error" in access) return access.error;

  const where: Prisma.DonorWhereInput = { campaignId: access.campaignId };
  if (capacity) where.capacity = capacity;
  if (type) where.type = type;
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { employer: { contains: q } },
    ];
  }

  const donors = await db.donor.findMany({
    where,
    orderBy: [{ capacity: "asc" }, { lastName: "asc" }],
    include: {
      donations: {
        select: { amountCents: true, donationDate: true },
        orderBy: { donationDate: "desc" },
      },
    },
  });

  const items = donors.map((d) => {
    const total = d.donations.reduce((s, x) => s + x.amountCents, 0);
    const last = d.donations[0]?.donationDate.toISOString() ?? null;
    return {
      id: d.id,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      address: d.address,
      city: d.city,
      state: d.state,
      zip: d.zip,
      employer: d.employer,
      occupation: d.occupation,
      type: d.type,
      capacity: d.capacity,
      isRecurring: d.isRecurring,
      notes: d.notes,
      voterId: d.voterId,
      campaignId: d.campaignId,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      totalDonatedCents: total,
      donationCount: d.donations.length,
      lastDonationDate: last,
    };
  });

  return NextResponse.json({ items });
}
