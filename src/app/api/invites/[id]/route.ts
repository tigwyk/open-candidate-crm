import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/api-auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invite = await db.invite.findUnique({ where: { id }, select: { campaignId: true } });
  if (!invite) return NextResponse.json({ error: "not found" }, { status: 404 });

  const access = await requireCampaignAccess(invite.campaignId, { role: "owner" });
  if ("error" in access) return access.error;

  await db.invite.update({ where: { id }, data: { status: "revoked" } });
  return NextResponse.json({ ok: true });
}
