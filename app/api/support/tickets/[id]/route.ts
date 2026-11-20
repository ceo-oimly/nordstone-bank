import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { supportMessages, supportTickets } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Support unavailable" }, { status: 503 });
  const [ticket] = await db.select().from(supportTickets).where(and(eq(supportTickets.id, params.id), eq(supportTickets.userId, auth.user.id))).limit(1);
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  const messages = await db.select().from(supportMessages).where(eq(supportMessages.ticketId, ticket.id)).orderBy(asc(supportMessages.createdAt));
  return NextResponse.json({ ticket, messages }, { headers: { "Cache-Control": "private, no-store" } });
}
