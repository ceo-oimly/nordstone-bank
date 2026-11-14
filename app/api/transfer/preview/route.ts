import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { currencies } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { getFxRate, getOwnedAccount } from "@/lib/transfer";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { amount?: unknown; transferType?: unknown; currency?: unknown } | null;
  const amountText = typeof body?.amount === "string" || typeof body?.amount === "number" ? String(body.amount) : "";
  if (!/^\d+(\.\d{1,2})?$/.test(amountText) || Number(amountText) <= 0 || !["local", "international"].includes(String(body?.transferType))) return NextResponse.json({ error: "Enter a valid transfer amount." }, { status: 400 });
  const account = await getOwnedAccount(auth.user.id);
  if (!account) return NextResponse.json({ error: "Account unavailable." }, { status: 404 });
  const amount = Number(amountText);
  const balance = Number(account.balance);
  if (!Number.isFinite(balance) || amount > balance) return NextResponse.json({ error: "The amount exceeds your available balance." }, { status: 400 });
  const transferType = body?.transferType as "local" | "international";
  if (transferType === "local") return NextResponse.json({ amount: amount.toFixed(2), fee: 0, total: amount.toFixed(2), newBalance: (balance - amount).toFixed(2), currency: account.currency });
  const currency = typeof body?.currency === "string" ? body.currency.toUpperCase() : "";
  if (!/^[A-Z]{3}$/.test(currency) || !db) return NextResponse.json({ error: "Choose a valid destination currency." }, { status: 400 });
  const [destination] = await db.select({ code: currencies.code }).from(currencies).where(eq(currencies.code, currency)).limit(1);
  if (!destination) return NextResponse.json({ error: "This destination currency is unavailable." }, { status: 400 });
  const fxRate = await getFxRate(account.currency, currency);
  if (fxRate === null) return NextResponse.json({ error: "A verified exchange rate is not available for this currency pair yet." }, { status: 503 });
  return NextResponse.json({ amount: amount.toFixed(2), fee: 0, total: amount.toFixed(2), newBalance: (balance - amount).toFixed(2), fxRate, recipientGets: (amount * fxRate).toFixed(2), currency });
}
