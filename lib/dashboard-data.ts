import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, cards, notifications, transactions } from "@/db/schema";

export function formatAccountAge(createdAt: Date) {
  const elapsed = Math.max(0, Date.now() - createdAt.getTime());
  const days = Math.floor(elapsed / 86_400_000);
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years} year${years === 1 ? "" : "s"}${months ? `, ${months} month${months === 1 ? "" : "s"}` : ""}`;
  if (months > 0) return `${months} month${months === 1 ? "" : "s"}`;
  return `${days} day${days === 1 ? "" : "s"}`;
}

export async function getDashboardData(user: { id: string; firstName: string; lastName: string; createdAt: Date }) {
  if (!db) return null;
  const [account] = await db.select({ id: accounts.id, accountNumber: accounts.accountNumber, balance: accounts.balance, currency: accounts.currency, status: accounts.status, transactionLimit: accounts.transactionLimit, createdAt: accounts.createdAt }).from(accounts).where(eq(accounts.userId, user.id)).limit(1);
  const cardRows = account ? await db.select({ id: cards.id, cardType: cards.cardType, last4: cards.last4, expiryMonth: cards.expiryMonth, expiryYear: cards.expiryYear, status: cards.status, holderName: cards.holderName, createdAt: cards.createdAt }).from(cards).where(and(eq(cards.userId, user.id), eq(cards.accountId, account.id))).orderBy(desc(cards.createdAt)) : [];
  const recentTransactions = account ? await db.select({ id: transactions.id, type: transactions.type, amount: transactions.amount, currency: transactions.currency, status: transactions.status, description: transactions.description, counterpartyName: transactions.counterpartyName, reference: transactions.reference, createdAt: transactions.createdAt }).from(transactions).where(and(eq(transactions.userId, user.id), eq(transactions.accountId, account.id))).orderBy(desc(transactions.createdAt)).limit(5) : [];
  const [pending, volume, unread] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)::text` }).from(transactions).where(and(eq(transactions.userId, user.id), eq(transactions.status, "pending"))),
    db.select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)::text` }).from(transactions).where(and(eq(transactions.userId, user.id), eq(transactions.status, "completed"))),
    db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false))),
  ]);
  const accountNumberMasked = account?.accountNumber ? `${account.accountNumber.slice(0, 4)}••••••` : "—";
  return {
    user: { firstName: user.firstName, lastName: user.lastName, initials: `${user.firstName.trim().charAt(0)}${user.lastName.trim().charAt(0)}`.toUpperCase() },
    account: account ? { accountNumberMasked, balance: account.balance, currency: account.currency, status: account.status, transactionLimit: account.transactionLimit, createdAt: account.createdAt } : null,
    cards: cardRows,
    recentTransactions,
    stats: { pendingTotal: pending[0]?.total ?? "0", volumeTotal: volume[0]?.total ?? "0", accountAge: formatAccountAge(user.createdAt) },
    unreadNotifications: Number(unread[0]?.value ?? 0),
  };
}
