import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getDashboardData(auth.user);
  if (!data) return NextResponse.json({ error: "Dashboard is unavailable." }, { status: 503 });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
