import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications, supportMessages, supportTickets, users } from "@/db/schema";
import { ADMIN_COOKIE, requireAdmin } from "@/lib/admin-auth";
import { sendSupportReplyEmail } from "@/lib/email";
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request.cookies.get(ADMIN_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Support unavailable" }, { status: 503 });
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 4000) return NextResponse.json({ error: "Message is required (up to 4,000 characters)." }, { status: 400 });
  const [row] = await db.select({ ticket: supportTickets, user: { id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email } }).from(supportTickets).innerJoin(users, eq(supportTickets.userId, users.id)).where(eq(supportTickets.id, params.id)).limit(1);
  if (!row) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  const [saved] = await db.insert(supportMessages).values({ ticketId: row.ticket.id, senderType: "admin", senderId: admin.user.id, message, source: "app" }).returning();
  await db.insert(notifications).values({ userId: row.user.id, type: "support", title: `Admin replied to ticket ${row.ticket.ticketNumber}`, message: "Open Support Center to continue your chat.", link: `/support/${row.ticket.id}` });
  let sent = false;
  try { const result = await sendSupportReplyEmail({ to: row.user.email, userName: `${row.user.firstName} ${row.user.lastName}`, ticketNumber: row.ticket.ticketNumber, ticketTitle: row.ticket.title, adminMessage: message, ticketId: row.ticket.id }); sent = result.sent; if (result.sent) await db.update(supportMessages).set({ sentViaEmail: true, emailMessageId: result.id }).where(eq(supportMessages.id, saved.id)); } catch { sent = false; }
  return NextResponse.json({ message: saved, sentViaEmail: sent, warning: sent ? null : "Email not sent - add RESEND_API_KEY" }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
