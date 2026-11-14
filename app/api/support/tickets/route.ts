import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { db } from "@/db";
import { supportTickets } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Support tickets are unavailable." }, { status: 503 });
  try {
    const tickets = await db.select({ id: supportTickets.id, ticketNumber: supportTickets.ticketNumber, title: supportTickets.title, priority: supportTickets.priority, status: supportTickets.status, createdAt: supportTickets.createdAt }).from(supportTickets).where(eq(supportTickets.userId, auth.user.id)).orderBy(desc(supportTickets.createdAt));
    return NextResponse.json({ tickets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Support tickets could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Support tickets are unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as { title?: unknown; priority?: unknown; description?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const priority = typeof body?.priority === "string" ? body.priority : "";
  const errors: Record<string, string> = {};
  if (title.length < 5 || title.length > 100) errors.title = "Title must be between 5 and 100 characters.";
  if (description.length < 20 || description.length > 2000) errors.description = "Description must be between 20 and 2,000 characters.";
  if (!["Low", "Medium", "High"].includes(priority)) errors.priority = "Choose Low, Medium, or High priority.";
  if (Object.keys(errors).length) return NextResponse.json({ error: "Please correct the ticket details.", fields: errors }, { status: 400 });
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const ticketNumber = `SUP-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
      const [ticket] = await db.insert(supportTickets).values({ userId: auth.user.id, ticketNumber, title, description, priority }).onConflictDoNothing({ target: supportTickets.ticketNumber }).returning({ id: supportTickets.id, ticketNumber: supportTickets.ticketNumber });
      if (ticket) {
        await createNotification(auth.user.id, { type: "support", title: "Support Ticket Created", message: `Your support request ${ticket.ticketNumber} was received. Our team will respond within 24 hours.`, link: `/support/${ticket.id}` });
        return NextResponse.json({ success: true, ticketNumber: ticket.ticketNumber, ticketId: ticket.id, redirect: "/support" }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
      }
    }
    return NextResponse.json({ error: "A ticket number could not be assigned. Please try again." }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "Your ticket could not be submitted. Please try again." }, { status: 500 });
  }
}
