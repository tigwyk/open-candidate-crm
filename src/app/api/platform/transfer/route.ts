import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePlatformOwner } from "@/lib/api-auth";
import { parseBody } from "@/lib/api-validate";
import { transferPlatformOwnerSchema } from "@/lib/validation/platform";

// POST /api/platform/transfer — hands platform ownership to another existing
// user by email. Single-owner model: the caller loses the flag as the target
// gains it, atomically.
export async function POST(req: NextRequest) {
  const access = await requirePlatformOwner();
  if ("error" in access) return access.error;

  const parsed = await parseBody(req, transferPlatformOwnerSchema);
  if ("error" in parsed) return parsed.error;
  const { email } = parsed.data;

  const target = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "No account found with that email" }, { status: 404 });
  }
  if (target.id === access.userId) {
    return NextResponse.json({ error: "You already own this" }, { status: 400 });
  }

  await db.$transaction([
    db.user.update({ where: { id: access.userId }, data: { isPlatformOwner: false } }),
    db.user.update({ where: { id: target.id }, data: { isPlatformOwner: true } }),
  ]);

  return NextResponse.json({ ok: true });
}
