import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireCampaignAccess } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const upcoming = sp.get("upcoming") === "1";
  const campaignId = sp.get("campaignId");
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const where: Prisma.EventWhereInput = { campaignId: access.campaignId };
  if (upcoming) {
    where.startTime = { gte: new Date() };
    where.status = "scheduled";
  }

  const events = await db.event.findMany({
    where,
    orderBy: { startTime: upcoming ? "asc" : "desc" },
    include: { _count: { select: { attendees: true } } },
    take: 100,
  });

  return NextResponse.json({
    items: events.map((e) => ({
      ...e,
      startTime: e.startTime.toISOString(),
      endTime: e.endTime?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      attendeeCount: e._count.attendees,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, type, startTime, endTime, location, address, capacity, description, campaignId } = body;
  if (!title || !startTime) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const event = await db.event.create({
    data: {
      title,
      type: type ?? "campaign",
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      location,
      address,
      capacity,
      description,
      campaignId: access.campaignId,
      status: "scheduled",
    },
  });
  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const event = await db.event.findUnique({ where: { id }, select: { campaignId: true } });
  if (!event) return NextResponse.json({ error: "not found" }, { status: 404 });
  const access = await requireCampaignAccess(event.campaignId);
  if ("error" in access) return access.error;

  const updated = await db.event.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json(updated);
}
