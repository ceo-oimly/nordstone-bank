import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim().toLowerCase() ?? "";
  if (!/^[a-z0-9]{3,20}$/.test(username)) return NextResponse.json({ available: false });
  if (!db) return NextResponse.json({ available: false }, { status: 503 });
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  return NextResponse.json({ available: !existing }, { headers: { "Cache-Control": "no-store" } });
}
