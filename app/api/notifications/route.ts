import { NextRequest, NextResponse } from "next/server";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Notifications are unavailable." }, { status: 503 });
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 5);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(50, Math.floor(rawLimit))) : 5;
  const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "true";
  const owner = eq(notifications.userId, auth.user.id);
  try {
    const [items, [unread]] = await Promise.all([
      db.select({ id: notifications.id, type: notifications.type, title: notifications.title, message: notifications.message, link: notifications.link, isRead: notifications.isRead, createdAt: notifications.createdAt }).from(notifications).where(unreadOnly ? and(owner, eq(notifications.isRead, false)) : owner).orderBy(desc(notifications.createdAt)).limit(limit),
      db.select({ value: count() }).from(notifications).where(and(owner, eq(notifications.isRead, false))),
    ]);
    return NextResponse.json({ notifications: items, unreadCount: Number(unread?.value ?? 0) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Notifications could not be loaded." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Notifications are unavailable." }, { status: 503 });
  try { await db.delete(notifications).where(eq(notifications.userId, auth.user.id)); return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return NextResponse.json({ error: "Notifications could not be deleted." }, { status: 500 }); }
}
