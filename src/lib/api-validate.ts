import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

function issuesResponse(prefix: string, error: z.ZodError) {
  return NextResponse.json(
    {
      error: prefix,
      issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    },
    { status: 400 }
  );
}

export async function parseBody<T extends z.ZodTypeAny>(
  req: NextRequest,
  schema: T
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  const raw = await req.json().catch(() => null);
  if (raw === null || typeof raw !== "object") {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { error: issuesResponse("Invalid request body", result.error) };
  }
  return { data: result.data };
}

export function parseQuery<T extends z.ZodTypeAny>(
  sp: URLSearchParams,
  schema: T
): { data: z.infer<T> } | { error: NextResponse } {
  const result = schema.safeParse(Object.fromEntries(sp.entries()));
  if (!result.success) {
    return { error: issuesResponse("Invalid query params", result.error) };
  }
  return { data: result.data };
}
