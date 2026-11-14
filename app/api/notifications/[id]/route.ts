import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Notifications are unavailable." }, { status: 503 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.id)) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  const [row] = await db.delete(notifications).where(and(eq(notifications.id, params.id), eq(notifications.userId, auth.user.id))).returning({ id: notifications.id });
  if (!row) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
}
