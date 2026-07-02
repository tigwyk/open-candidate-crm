import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// GET /api/invites/token/[token] — public lookup for the accept page.
// Never returns the token itself or unrelated campaign data.
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(await headers());
  if (!checkRateLimit(`invite-lookup:${ip}`, { max: 30, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { token } = await params;
  const invite = await db.invite.findUnique({
    where: { token },
    include: { campaign: { select: { candidateName: true, officeSought: true } } },
  });

  if (!invite) return NextResponse.json({ error: "not found" }, { status: 404 });

  let status = invite.status;
  if (status === "pending" && invite.expiresAt < new Date()) {
    status = "expired";
    await db.invite.update({ where: { id: invite.id }, data: { status: "expired" } });
  }

  return NextResponse.json({
    email: invite.email,
    campaignName: invite.campaign.candidateName,
    officeSought: invite.campaign.officeSought,
    status,
  });
}
