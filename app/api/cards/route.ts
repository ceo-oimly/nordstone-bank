import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Cards are unavailable." }, { status: 503 });
  try {
    const owned = eq(cards.userId, auth.user.id);
    const [allCards, [active], [pending], [balance]] = await Promise.all([
      db.select({ id: cards.id, cardType: cards.cardType, cardLevel: cards.cardLevel, currency: cards.currency, last4: cards.last4, expiryMonth: cards.expiryMonth, expiryYear: cards.expiryYear, status: cards.status, holderName: cards.holderName, balance: cards.balance, createdAt: cards.createdAt }).from(cards).where(owned).orderBy(sql`${cards.createdAt} desc`),
      db.select({ value: count() }).from(cards).where(and(owned, eq(cards.status, "active"))),
      db.select({ value: count() }).from(cards).where(and(owned, eq(cards.status, "pending"))),
      db.select({ value: sql<string>`coalesce(sum(${cards.balance}), 0)` }).from(cards).where(owned),
    ]);
    return NextResponse.json({ cards: allCards.map((card) => ({ ...card, maskedNumber: `•••• •••• •••• ${card.last4}` })), stats: { activeCount: Number(active?.value ?? 0), pendingCount: Number(pending?.value ?? 0), totalBalance: Number(balance?.value ?? 0) } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Cards could not be loaded." }, { status: 503 });
  }
}
