import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Notifications are unavailable." }, { status: 503 });
  try { await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, auth.user.id), eq(notifications.isRead, false))); return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return NextResponse.json({ error: "Notifications could not be updated." }, { status: 500 }); }
}
