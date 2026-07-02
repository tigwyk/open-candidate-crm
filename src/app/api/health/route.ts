import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/health — public liveness check. Confirms the app can actually
// reach the database, not just that the process is running.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Health check failed:", e);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
