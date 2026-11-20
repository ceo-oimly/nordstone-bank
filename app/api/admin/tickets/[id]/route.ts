import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { supportMessages, supportTickets, users } from "@/db/schema";
import { ADMIN_COOKIE, requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request.cookies.get(ADMIN_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Support unavailable" }, { status: 503 });
  const [row] = await db.select({ ticket: supportTickets, user: { id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email } }).from(supportTickets).innerJoin(users, eq(supportTickets.userId, users.id)).where(eq(supportTickets.id, params.id)).limit(1);
  if (!row) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  const messages = await db.select().from(supportMessages).where(eq(supportMessages.ticketId, params.id)).orderBy(asc(supportMessages.createdAt));
  return NextResponse.json({ ticket: row.ticket, user: { ...row.user, name: `${row.user.firstName} ${row.user.lastName}` }, messages }, { headers: { "Cache-Control": "private, no-store" } });
}
