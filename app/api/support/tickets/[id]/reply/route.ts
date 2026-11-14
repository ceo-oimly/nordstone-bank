import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { supportMessages, supportTickets } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.id)) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  if (!db) return NextResponse.json({ error: "Support replies are unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (message.length < 1 || message.length > 2000) return NextResponse.json({ error: "Reply must contain 1 to 2,000 characters." }, { status: 400 });
  const [ticket] = await db.select({ id: supportTickets.id }).from(supportTickets).where(and(eq(supportTickets.id, params.id), eq(supportTickets.userId, auth.user.id))).limit(1);
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  try {
    await db.insert(supportMessages).values({ ticketId: ticket.id, senderType: "user", senderId: auth.user.id, message });
    await db.update(supportTickets).set({ updatedAt: new Date() }).where(and(eq(supportTickets.id, ticket.id), eq(supportTickets.userId, auth.user.id)));
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Your reply could not be sent. Please try again." }, { status: 500 });
  }
}
