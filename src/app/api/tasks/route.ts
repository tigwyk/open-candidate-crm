import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireCampaignAccess, assertBelongsToCampaign } from "@/lib/api-auth";
import { parseBody } from "@/lib/api-validate";
import { taskCreateSchema, taskPatchSchema } from "@/lib/validation/task";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const priority = sp.get("priority");
  const assignedTo = sp.get("assignedTo");
  const campaignId = sp.get("campaignId");
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const where: Prisma.TaskWhereInput = { campaignId: access.campaignId };
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
  const parsed = await parseBody(req, taskPatchSchema);
  if ("error" in parsed) return parsed.error;
  const { id, status, priority, dueDate, title, description, assignedVolunteerId } = parsed.data;

  const task = await db.task.findUnique({ where: { id }, select: { campaignId: true } });
  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
  const access = await requireCampaignAccess(task.campaignId);
  if ("error" in access) return access.error;

  const volunteerErr = await assertBelongsToCampaign(db.volunteer, assignedVolunteerId, access.campaignId, "volunteer");
  if (volunteerErr) return volunteerErr;

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
  const parsed = await parseBody(req, taskCreateSchema);
  if ("error" in parsed) return parsed.error;
  const { title, description, priority, dueDate, campaignId, assignedVolunteerId } = parsed.data;
  const access = await requireCampaignAccess(campaignId);
  if ("error" in access) return access.error;

  const volunteerErr = await assertBelongsToCampaign(db.volunteer, assignedVolunteerId, access.campaignId, "volunteer");
  if (volunteerErr) return volunteerErr;

  const task = await db.task.create({
    data: {
      title,
      description,
      priority: priority ?? "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      campaignId: access.campaignId,
      assignedVolunteerId: assignedVolunteerId || null,
      status: "todo",
    },
  });
  return NextResponse.json(task);
}
