import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards, transactions } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Card details are unavailable." }, { status: 503 });
  const [card] = await db.select({ id: cards.id, cardType: cards.cardType, cardLevel: cards.cardLevel, currency: cards.currency, last4: cards.last4, token: cards.token, expiryMonth: cards.expiryMonth, expiryYear: cards.expiryYear, status: cards.status, isActive: cards.isActive, holderName: cards.holderName, billingAddress: cards.billingAddress, dailyLimit: cards.dailyLimit, balance: cards.balance, createdAt: cards.createdAt, activatedAt: cards.activatedAt }).from(cards).where(and(eq(cards.id, params.id), eq(cards.userId, auth.user.id))).limit(1);
  if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  const recentTransactions = await db.select({ id: transactions.id, type: transactions.type, amount: transactions.amount, currency: transactions.currency, status: transactions.status, description: transactions.description, reference: transactions.reference, createdAt: transactions.createdAt }).from(transactions).where(and(eq(transactions.userId, auth.user.id), eq(transactions.cardId, card.id))).orderBy(desc(transactions.createdAt)).limit(10);
  const { token, ...publicCard } = card;
  return NextResponse.json({ card: { ...publicCard, maskedToken: `tok_••••${token.slice(-4)}`, maskedNumber: `•••• •••• •••• ${card.last4}` }, transactions: recentTransactions }, { headers: { "Cache-Control": "private, no-store" } });
}
