import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const precincts = await db.precinct.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { voters: true, households: true } },
    },
  });
  return NextResponse.json({ items: precincts });
}
