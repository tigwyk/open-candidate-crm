import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { db } from "@/lib/db";

// Constant-time string comparison, immune to both content and length
// timing side-channels (hash both sides to a fixed-length digest first).
function timingSafeStringEqual(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a).digest();
  const digestB = createHash("sha256").update(b).digest();
  return timingSafeEqual(digestA, digestB);
}

function isAuthorized(req: NextRequest): boolean {
  const expectedUser = process.env.POSTMARK_WEBHOOK_USERNAME;
  const expectedPass = process.env.POSTMARK_WEBHOOK_PASSWORD;
  if (!expectedUser || !expectedPass) return false;

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);
  return timingSafeStringEqual(user, expectedUser) && timingSafeStringEqual(pass, expectedPass);
}

// POST /api/webhooks/postmark/bounce — public, Basic Auth protected.
// Configured as the Bounce webhook URL in Postmark's dashboard.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  const inviteId = body?.Metadata?.inviteId;
  if (!inviteId || typeof inviteId !== "string") {
    return NextResponse.json({ ok: true });
  }

  const invite = await db.invite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ ok: true });
  }

  await db.invite.update({
    where: { id: inviteId },
    data: {
      status: "bounced",
      bouncedAt: typeof body.BouncedAt === "string" ? new Date(body.BouncedAt) : new Date(),
      bounceType: typeof body.Type === "string" ? body.Type : null,
      postmarkBounceId: typeof body.ID === "number" ? body.ID : null,
    },
  });

  return NextResponse.json({ ok: true });
}
