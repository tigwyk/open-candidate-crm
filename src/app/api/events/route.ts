import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const upcoming = sp.get("upcoming") === "1";

  const where: Prisma.EventWhereInput = {};
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
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { title, type, startTime, endTime, location, address, capacity, description, campaignId } = body;
  if (!title || !startTime) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  // If no campaignId provided, use the first campaign
  let cid = campaignId;
  if (!cid) {
    const c = await db.campaign.findFirst({ orderBy: { createdAt: "asc" } });
    if (!c) return NextResponse.json({ error: "no campaign" }, { status: 400 });
    cid = c.id;
  }
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
      campaignId: cid,
      status: "scheduled",
    },
  });
  return NextResponse.json(event);
}

export async function PATCH(req: NextRequest) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { id, status } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const updated = await db.event.update({
    where: { id },
    data: { status },
  });
  return NextResponse.json(updated);
}
