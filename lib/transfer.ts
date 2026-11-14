import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, exchangeRates } from "@/db/schema";

export async function getOwnedAccount(userId: string) {
  if (!db) return null;
  const [account] = await db.select({ id: accounts.id, accountNumber: accounts.accountNumber, balance: accounts.balance, currency: accounts.currency, status: accounts.status }).from(accounts).where(eq(accounts.userId, userId)).limit(1);
  return account ?? null;
}

export async function getFxRate(from: string, to: string) {
  if (from === to) return 1;
  if (!db) return null;
  const rows = await db.select({ code: exchangeRates.currencyCode, rate: exchangeRates.rate }).from(exchangeRates).where(inArray(exchangeRates.currencyCode, [from, to]));
  const fromRate = rows.find((row) => row.code === from);
  const toRate = rows.find((row) => row.code === to);
  if (!fromRate || !toRate || Number(fromRate.rate) <= 0) return null;
  return Number(toRate.rate) / Number(fromRate.rate);
}

export function maskedAccountNumber(accountNumber: string) {
  return `${accountNumber.slice(0, 4)}••••••`;
}
