import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const priority = sp.get("priority");
  const assignedTo = sp.get("assignedTo");

  const where: Prisma.TaskWhereInput = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedTo) where.assignedVolunteerId = assignedTo;

  const tasks = await db.task.findMany({
    where,
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    include: {
      volunteer: { select: { firstName: true, lastName: true } },
      voter: { select: { firstName: true, lastName: true } },
    },
    take: 200,
  });

  return NextResponse.json({
    items: tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { id, status, priority, dueDate, title, description, assignedVolunteerId } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const data: Prisma.TaskUpdateInput = {};
  if (status) data.status = status;
  if (priority) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (assignedVolunteerId !== undefined) {
    data.volunteer = assignedVolunteerId ? { connect: { id: assignedVolunteerId } } : { disconnect: true };
  }
  const updated = await db.task.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireSession();
  if (unauthorized) return unauthorized;

  const body = await req.json();
  const { title, description, priority, dueDate, campaignId, assignedVolunteerId } = body;
  if (!title) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  let cid = campaignId;
  if (!cid) {
    const c = await db.campaign.findFirst({ orderBy: { createdAt: "asc" } });
    if (!c) return NextResponse.json({ error: "no campaign" }, { status: 400 });
    cid = c.id;
  }
  const task = await db.task.create({
    data: {
      title,
      description,
      priority: priority ?? "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      campaignId: cid,
      assignedVolunteerId: assignedVolunteerId || null,
      status: "todo",
    },
  });
  return NextResponse.json(task);
}
