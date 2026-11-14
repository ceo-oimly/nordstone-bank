import { NextRequest, NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { currencies, exchangeRates } from "@/db/schema";

export const revalidate = 3600;
export async function GET(request: NextRequest) {
  if (!db) return NextResponse.json({ rates: [], lastUpdated: null });
  const from = request.nextUrl.searchParams.get("from")?.toUpperCase();
  const to = request.nextUrl.searchParams.get("to")?.toUpperCase();
  if (from || to) {
    if (!from || !to || !/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return NextResponse.json({ error: "Provide valid from and to currency codes." }, { status: 400 });
    if (from === to) return NextResponse.json({ from, to, rate: 1 });
    const rows = await db.select({ code: exchangeRates.currencyCode, rate: exchangeRates.rate, lastUpdated: exchangeRates.lastUpdated }).from(exchangeRates).where(inArray(exchangeRates.currencyCode, [from, to]));
    const fromRate = rows.find((row) => row.code === from);
    const toRate = rows.find((row) => row.code === to);
    if (!fromRate || !toRate || Number(fromRate.rate) <= 0) return NextResponse.json({ error: "An exchange rate for this currency pair is not available." }, { status: 404 });
    const lastUpdated = rows.reduce<Date | null>((latest, row) => !latest || row.lastUpdated > latest ? row.lastUpdated : latest, null);
    return NextResponse.json({ from, to, rate: Number(toRate.rate) / Number(fromRate.rate), lastUpdated }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" } });
  }
  const rows = await db.select({ code: exchangeRates.currencyCode, rate: exchangeRates.rate, change24h: exchangeRates.change24h, lastUpdated: exchangeRates.lastUpdated, name: currencies.name, flagEmoji: currencies.flagEmoji }).from(exchangeRates).innerJoin(currencies, eq(exchangeRates.currencyCode, currencies.code)).where(eq(currencies.isActive, true)).orderBy(asc(currencies.sortOrder));
  const lastUpdated = rows.reduce<Date | null>((latest, row) => !latest || row.lastUpdated > latest ? row.lastUpdated : latest, null);
  return NextResponse.json({ rates: rows.map((row) => ({ ...row, rate: Number(row.rate), change24h: Number(row.change24h) })), lastUpdated }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300" } });
}
