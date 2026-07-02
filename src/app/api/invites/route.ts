import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { requireCampaignAccess } from "@/lib/api-auth";
import { parseBody } from "@/lib/api-validate";
import { createInviteSchema } from "@/lib/validation/invite";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendInviteEmail, reactivateBounce } from "@/lib/email";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const access = await requireCampaignAccess(campaignId, { role: "owner" });
  if ("error" in access) return access.error;

  const invites = await db.invite.findMany({
    where: { campaignId: access.campaignId, status: { in: ["pending", "bounced"] } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: invites.map((i) => ({
      id: i.id,
      email: i.email,
      status: i.status,
      bounceType: i.bounceType,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, createInviteSchema);
  if ("error" in parsed) return parsed.error;
  const { campaignId, email } = parsed.data;

  const access = await requireCampaignAccess(campaignId, { role: "owner" });
  if ("error" in access) return access.error;

  if (!checkRateLimit(`invite-create:${access.userId}`, { max: 20, windowMs: 60 * 60_000 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const [campaign, inviter] = await Promise.all([
    db.campaign.findUnique({ where: { id: access.campaignId }, select: { candidateName: true } }),
    db.user.findUnique({ where: { id: access.userId }, select: { name: true } }),
  ]);

  const existing = await db.invite.findUnique({
    where: { campaignId_email: { campaignId: access.campaignId, email } },
  });

  // If this address previously bounced, un-suppress it on Postmark's end
  // before resending — otherwise Postmark silently drops the new send too.
  if (existing?.status === "bounced" && existing.postmarkBounceId) {
    try {
      await reactivateBounce(existing.postmarkBounceId);
    } catch (e) {
      console.error("Failed to reactivate bounced address:", e);
    }
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const invite = await db.invite.upsert({
    where: { campaignId_email: { campaignId: access.campaignId, email } },
    create: {
      campaignId: access.campaignId,
      email,
      token,
      expiresAt,
      invitedById: access.userId,
      status: "pending",
    },
    update: {
      token,
      expiresAt,
      status: "pending",
      invitedById: access.userId,
      bouncedAt: null,
      bounceType: null,
      postmarkBounceId: null,
    },
  });

  try {
    const sent = await sendInviteEmail({
      to: email,
      campaignName: campaign?.candidateName ?? "a campaign",
      invitedByName: inviter?.name ?? "A campaign owner",
      token: invite.token,
      inviteId: invite.id,
    });
    if (sent) {
      await db.invite.update({
        where: { id: invite.id },
        data: { postmarkMessageId: sent.messageId },
      });
    }
  } catch (e) {
    console.error("Failed to send invite email:", e);
  }

  return NextResponse.json({ ok: true, id: invite.id });
}
