import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/api-auth";

const CLAIM_TTL_MS = 5 * 60 * 1000;

function isStale(claimedAt: Date) {
  return Date.now() - claimedAt.getTime() > CLAIM_TTL_MS;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const channel = sp.get("channel");
  if (!channel) return NextResponse.json({ error: "channel required" }, { status: 400 });
  const campaignId = sp.get("campaignId");
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const claims = await db.contactClaim.findMany({
    where: { channel, campaignId: access.campaignId },
    include: {
      volunteer: { select: { firstName: true, lastName: true } },
    },
  });

  const active = claims.filter((c) => !isStale(c.claimedAt));

  return NextResponse.json({
    items: active.map((c) => ({
      voterId: c.voterId,
      channel: c.channel,
      volunteerId: c.volunteerId,
      volunteerName: c.volunteer ? `${c.volunteer.firstName} ${c.volunteer.lastName}` : null,
      claimedAt: c.claimedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { voterId, channel, volunteerId } = body;
  if (!voterId || !channel || !volunteerId) {
    return NextResponse.json({ error: "voterId, channel, volunteerId required" }, { status: 400 });
  }

  const voter = await db.voter.findUnique({ where: { id: voterId }, select: { campaignId: true } });
  if (!voter) return NextResponse.json({ error: "voter not found" }, { status: 404 });
  const access = await requireCampaignAccess(voter.campaignId);
  if ("error" in access) return access.error;

  const existing = await db.contactClaim.findUnique({
    where: { voterId_channel: { voterId, channel } },
    include: { volunteer: { select: { firstName: true, lastName: true } } },
  });

  if (existing && existing.volunteerId !== volunteerId && !isStale(existing.claimedAt)) {
    return NextResponse.json(
      {
        error: "claimed",
        claimedBy: existing.volunteer
          ? `${existing.volunteer.firstName} ${existing.volunteer.lastName}`
          : "another volunteer",
      },
      { status: 409 }
    );
  }

  const claim = await db.contactClaim.upsert({
    where: { voterId_channel: { voterId, channel } },
    create: { voterId, channel, volunteerId, campaignId: voter.campaignId },
    update: { volunteerId, claimedAt: new Date() },
  });

  return NextResponse.json(claim);
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { voterId, channel, volunteerId } = body;
  if (!voterId || !channel || !volunteerId) {
    return NextResponse.json({ error: "voterId, channel, volunteerId required" }, { status: 400 });
  }

  const existing = await db.contactClaim.findUnique({
    where: { voterId_channel: { voterId, channel } },
  });

  if (!existing) return NextResponse.json({ ok: true });

  const access = await requireCampaignAccess(existing.campaignId);
  if ("error" in access) return access.error;

  if (existing.volunteerId !== volunteerId && !isStale(existing.claimedAt)) {
    return NextResponse.json({ error: "not your claim" }, { status: 403 });
  }

  await db.contactClaim.delete({ where: { voterId_channel: { voterId, channel } } });
  return NextResponse.json({ ok: true });
}
