import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { supportMessages, supportTickets, users } from "@/db/schema";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const data = payload?.data ?? payload;
  const subject = String(data?.subject ?? "");
  const match = subject.match(/\[(SUP-\d{6})\]/i);
  if (!match) { console.info("Ignoring inbound support email without a ticket number"); return NextResponse.json({ ignored: true }); }
  if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.ticketNumber, match[1].toUpperCase())).limit(1);
  if (!ticket) return NextResponse.json({ ignored: true });
  const from = String(data?.from ?? data?.sender?.email ?? "").match(/<([^>]+)>/)?.[1] ?? String(data?.from ?? "");
  const [owner] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, ticket.userId)).limit(1);
  if (!owner || owner.email.toLowerCase() !== from.toLowerCase()) { console.info("Ignoring inbound reply from an address that does not own the ticket"); return NextResponse.json({ ignored: true }); }
  const text = String(data?.text ?? data?.email?.text ?? "").trim();
  if (!text) return NextResponse.json({ ignored: true });
  const [message] = await db.insert(supportMessages).values({ ticketId: ticket.id, senderType: "user", senderId: owner.id, message: text.slice(0, 4000), source: "email", sentViaEmail: true, emailMessageId: data?.email_id ? String(data.email_id) : null }).returning();
  return NextResponse.json({ accepted: true, messageId: message.id });
}
