import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");

  const where: Prisma.VolunteerWhereInput = {};
  if (campaignId) where.campaignId = campaignId;

  const volunteers = await db.volunteer.findMany({
    where,
    orderBy: [{ status: "asc" }, { hoursLogged: "desc" }],
    include: {
      _count: { select: { assignedTasks: true, canvassLogs: true, callLogs: true } },
    },
  });

  return NextResponse.json({ items: volunteers });
}

export async function PATCH(req: NextRequest) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { id, status, role, hoursLogged, notes } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const data: Prisma.VolunteerUpdateInput = {};
  if (status) data.status = status;
  if (role) data.role = role;
  if (hoursLogged !== undefined) data.hoursLogged = hoursLogged;
  if (notes !== undefined) data.notes = notes;
  const updated = await db.volunteer.update({ where: { id }, data });
  return NextResponse.json(updated);
}
