import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const TOO_MANY_REQUESTS = () =>
  NextResponse.json({ error: "Too many requests" }, { status: 429 });

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

type UserResult = { error: NextResponse } | { userId: string };

export async function requireUser(): Promise<UserResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    // Pre-auth requests are rate-limited by IP, since there's no user identity yet.
    const ip = getClientIp(await headers());
    if (!checkRateLimit(`ip:${ip}`, { max: 60, windowMs: 60_000 })) {
      return { error: TOO_MANY_REQUESTS() };
    }
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!checkRateLimit(`user:${session.user.id}`, { max: 240, windowMs: 60_000 })) {
    return { error: TOO_MANY_REQUESTS() };
  }

  return { userId: session.user.id };
}

type CampaignAccessResult =
  | { error: NextResponse }
  | { userId: string; campaignId: string; role: "owner" | "member" };

export async function requireCampaignAccess(
  campaignId: string | null | undefined,
  opts?: { role: "owner" }
): Promise<CampaignAccessResult> {
  const u = await requireUser();
  if ("error" in u) return u;

  if (!campaignId) {
    return { error: NextResponse.json({ error: "campaignId required" }, { status: 400 }) };
  }

  const membership = await db.campaignMembership.findUnique({
    where: { userId_campaignId: { userId: u.userId, campaignId } },
  });
  if (!membership) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (opts?.role === "owner" && membership.role !== "owner") {
    return { error: NextResponse.json({ error: "Owner role required" }, { status: 403 }) };
  }

  return {
    userId: u.userId,
    campaignId,
    role: membership.role as "owner" | "member",
  };
}
