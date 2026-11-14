import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { cards, users } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Card details are unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const [user] = await db.select({ pinHash: users.pinHash }).from(users).where(eq(users.id, auth.user.id)).limit(1);
  if (!user?.pinHash || !/^\d{4}$/.test(pin) || !(await bcrypt.compare(pin, user.pinHash))) return NextResponse.json({ error: "The PIN is incorrect." }, { status: 401 });
  const [card] = await db.select({ last4: cards.last4, expiryMonth: cards.expiryMonth, expiryYear: cards.expiryYear, token: cards.token }).from(cards).where(and(eq(cards.id, params.id), eq(cards.userId, auth.user.id))).limit(1);
  if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  return NextResponse.json({ details: { maskedNumber: `•••• •••• •••• ${card.last4}`, expiryMonth: card.expiryMonth, expiryYear: card.expiryYear, maskedToken: `tok_••••${card.token.slice(-4)}` } }, { headers: { "Cache-Control": "private, no-store" } });
}
