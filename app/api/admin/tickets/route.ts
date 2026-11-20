import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { supportMessages, supportTickets, users } from "@/db/schema";
import { ADMIN_COOKIE, requireAdmin } from "@/lib/admin-auth";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request.cookies.get(ADMIN_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Support unavailable" }, { status: 503 });
  const rows = await db.select({ id: supportTickets.id, ticketNumber: supportTickets.ticketNumber, title: supportTickets.title, description: supportTickets.description, priority: supportTickets.priority, createdAt: supportTickets.createdAt, userId: users.id, userName: users.firstName, lastName: users.lastName, email: users.email }).from(supportTickets).innerJoin(users, eq(supportTickets.userId, users.id)).orderBy(desc(supportTickets.createdAt));
  const tickets = await Promise.all(rows.map(async (row) => { const [last] = await db!.select({ message: supportMessages.message, createdAt: supportMessages.createdAt }).from(supportMessages).where(eq(supportMessages.ticketId, row.id)).orderBy(desc(supportMessages.createdAt)).limit(1); return { ...row, userName: `${row.userName} ${row.lastName}`, lastMessage: last?.message ?? row.description, lastMessageAt: last?.createdAt ?? row.createdAt }; }));
  return NextResponse.json({ tickets }, { headers: { "Cache-Control": "private, no-store" } });
}
