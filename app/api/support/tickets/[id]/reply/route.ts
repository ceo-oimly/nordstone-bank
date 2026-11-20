import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { supportMessages, supportTickets } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Support unavailable" }, { status: 503 });
  const [ticket] = await db.select({ id: supportTickets.id }).from(supportTickets).where(and(eq(supportTickets.id, params.id), eq(supportTickets.userId, auth.user.id))).limit(1);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 4000) return NextResponse.json({ error: "Message is required (up to 4,000 characters)." }, { status: 400 });
  const [saved] = await db.insert(supportMessages).values({ ticketId: ticket.id, senderType: "user", senderId: auth.user.id, message, source: "app" }).returning();
  return NextResponse.json({ message: saved }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
