import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ error: "Card requests are not available yet." }, { status: 501 });
}
