import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { db } from "@/db";
import { supportMessages, supportTickets } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Support unavailable" }, { status: 503 });
  const tickets = await db.select().from(supportTickets).where(eq(supportTickets.userId, auth.user.id)).orderBy(desc(supportTickets.createdAt));
  const withPreview = await Promise.all(tickets.map(async (ticket) => {
    const [last] = await db!.select({ message: supportMessages.message, createdAt: supportMessages.createdAt }).from(supportMessages).where(eq(supportMessages.ticketId, ticket.id)).orderBy(desc(supportMessages.createdAt)).limit(1);
    return { ...ticket, lastMessage: last?.message ?? ticket.description, lastMessageAt: last?.createdAt ?? ticket.createdAt };
  }));
  return NextResponse.json({ tickets: withPreview }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Support unavailable" }, { status: 503 });
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const priority = typeof body?.priority === "string" ? body.priority : "";
  if (title.length < 3 || title.length > 100 || !description || description.length > 4000 || !["Low", "Medium", "High"].includes(priority)) return NextResponse.json({ error: "Enter a title, describe the issue, and select a priority." }, { status: 400 });
  for (let attempt = 0; attempt < 5; attempt++) {
    const ticketNumber = `SUP-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
    const [ticket] = await db.insert(supportTickets).values({ userId: auth.user.id, ticketNumber, title, description, priority }).onConflictDoNothing({ target: supportTickets.ticketNumber }).returning();
    if (ticket) {
      await db.insert(supportMessages).values({ ticketId: ticket.id, senderType: "user", senderId: auth.user.id, message: description, source: "app" });
      return NextResponse.json({ ticket }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
    }
  }
  return NextResponse.json({ error: "Could not create ticket. Try again." }, { status: 503 });
}
