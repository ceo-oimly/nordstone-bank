import { NextRequest, NextResponse } from "next/server";
import { randomInt, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, cardApplications, cards, currencies } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { createNotification } from "@/lib/notifications";

const cardTypes = ["Visa", "Mastercard", "American Express"] as const;
const cardLevels = ["Standard", "Gold", "Platinum"] as const;

export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Card applications are unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const cardType = typeof body?.cardType === "string" ? body.cardType : "";
  const cardLevel = typeof body?.cardLevel === "string" ? body.cardLevel : "";
  const currency = typeof body?.currency === "string" ? body.currency.toUpperCase() : "";
  const holderName = typeof body?.holderName === "string" ? body.holderName.trim() : "";
  const billingAddress = typeof body?.billingAddress === "string" ? body.billingAddress.trim() : "";
  const dailyLimit = Number(body?.dailyLimit);
  const errors: Record<string, string> = {};
  if (!cardTypes.includes(cardType as typeof cardTypes[number])) errors.cardType = "Choose a supported card type.";
  if (!cardLevels.includes(cardLevel as typeof cardLevels[number])) errors.cardLevel = "Choose a card level.";
  if (!Number.isFinite(dailyLimit) || dailyLimit < 1000 || dailyLimit > 10000) errors.dailyLimit = "Daily limit must be between $1,000 and $10,000.";
  if (!holderName || holderName.length > 240) errors.holderName = "Enter a cardholder name (up to 240 characters).";
  if (!billingAddress || billingAddress.length > 2000) errors.billingAddress = "Enter a billing address (up to 2,000 characters).";
  if (!/^[A-Z]{3}$/.test(currency)) errors.currency = "Choose a valid currency.";
  if (Object.keys(errors).length) return NextResponse.json({ error: "Please correct the highlighted fields.", fields: errors }, { status: 400 });
  try {
    const [[account], [currencyRow]] = await Promise.all([
      db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, auth.user.id)).limit(1),
      db.select({ code: currencies.code }).from(currencies).where(and(eq(currencies.code, currency), eq(currencies.isActive, true))).limit(1),
    ]);
    if (!account) return NextResponse.json({ error: "No eligible account was found." }, { status: 400 });
    if (!currencyRow) return NextResponse.json({ error: "Choose a currency available in your account." }, { status: 400 });
    const now = new Date();
    const expiry = new Date(now); expiry.setUTCFullYear(expiry.getUTCFullYear() + 3);
    const [card] = await db.insert(cards).values({ userId: auth.user.id, accountId: account.id, cardType, cardLevel, currency, last4: String(randomInt(0, 10000)).padStart(4, "0"), token: `tok_${randomUUID()}`, expiryMonth: expiry.getUTCMonth() + 1, expiryYear: expiry.getUTCFullYear(), holderName, billingAddress, dailyLimit: dailyLimit.toFixed(2), status: "pending", isActive: false }).returning({ id: cards.id, status: cards.status });
    await db.insert(cardApplications).values({ userId: auth.user.id, cardId: card.id, status: "pending" });
    await createNotification(auth.user.id, { type: "card", title: "Card Application Submitted", message: `Your ${cardType} virtual card application has been submitted for review.`, link: "/cards" });
    return NextResponse.json({ success: true, cardId: card.id, status: card.status }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "We could not submit your application. Please try again." }, { status: 500 });
  }
}
