import { and, asc, count, desc, eq, gte, ilike, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";

export type TransactionSort = "newest" | "oldest" | "amount_high" | "amount_low";
export type TransactionStatus = "all" | "completed" | "pending" | "failed";
export type TransactionFilters = { search: string; from: string; to: string; status: TransactionStatus; sort: TransactionSort; perPage: number; page: number };

function validDate(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()));
}

function todayUtc() { return new Date().toISOString().slice(0, 10); }
function daysAgoUtc(days: number) { const date = new Date(); date.setUTCDate(date.getUTCDate() - days); return date.toISOString().slice(0, 10); }

export function parseTransactionFilters(params: URLSearchParams | Record<string, string | string[] | undefined>): TransactionFilters {
  const get = (key: string) => params instanceof URLSearchParams ? params.get(key) ?? undefined : Array.isArray(params[key]) ? params[key]?.[0] : params[key];
  const statusRaw = get("status");
  const sortRaw = get("sort");
  const perPageRaw = Number(get("perPage") ?? 10);
  const pageRaw = Number(get("page") ?? 1);
  const status: TransactionStatus = ["completed", "pending", "failed"].includes(statusRaw || "") ? statusRaw as TransactionStatus : "all";
  const sort: TransactionSort = ["newest", "oldest", "amount_high", "amount_low"].includes(sortRaw || "") ? sortRaw as TransactionSort : "newest";
  const perPage = [10, 25, 50, 100].includes(perPageRaw) ? perPageRaw : 10;
  return {
    search: (get("search") || "").trim().slice(0, 200),
    from: validDate(get("from")) ? get("from")! : daysAgoUtc(30),
    to: validDate(get("to")) ? get("to")! : todayUtc(),
    status,
    sort,
    perPage,
    page: Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1,
  };
}

export function transactionWhere(userId: string, filters: TransactionFilters) {
  const conditions = [eq(transactions.userId, userId)];
  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(ilike(transactions.reference, pattern), ilike(transactions.description, pattern), ilike(transactions.recipientName, pattern))!);
  }
  if (filters.status !== "all") conditions.push(eq(transactions.status, filters.status));
  if (validDate(filters.from)) conditions.push(gte(transactions.createdAt, new Date(`${filters.from}T00:00:00.000Z`)));
  if (validDate(filters.to)) {
    const exclusiveEnd = new Date(`${filters.to}T00:00:00.000Z`);
    exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
    conditions.push(lt(transactions.createdAt, exclusiveEnd));
  }
  return and(...conditions)!;
}

export function transactionOrder(sort: TransactionSort) {
  if (sort === "oldest") return asc(transactions.createdAt);
  if (sort === "amount_high") return desc(transactions.amount);
  if (sort === "amount_low") return asc(transactions.amount);
  return desc(transactions.createdAt);
}

const transactionProjection = {
  id: transactions.id,
  type: transactions.type,
  amount: transactions.amount,
  currency: transactions.currency,
  status: transactions.status,
  description: transactions.description,
  counterpartyName: transactions.counterpartyName,
  recipientName: transactions.recipientName,
  recipientAccountNumber: transactions.recipientAccountNumber,
  recipientBank: transactions.recipientBank,
  transferType: transactions.transferType,
  reference: transactions.reference,
  createdAt: transactions.createdAt,
};

export async function getFilteredTransactions(userId: string, filters: TransactionFilters, paginate = true) {
  if (!db) return { rows: [], total: 0 };
  const where = transactionWhere(userId, filters);
  const [totalRow] = await db.select({ value: count() }).from(transactions).where(where);
  const query = db.select(transactionProjection).from(transactions).where(where).orderBy(transactionOrder(filters.sort));
  const rows = paginate ? await query.limit(filters.perPage).offset((filters.page - 1) * filters.perPage) : await query;
  return { rows, total: Number(totalRow?.value ?? 0) };
}

export function totalPages(total: number, perPage: number) {
  return Math.max(1, Math.ceil(total / perPage));
}

export function sumByType(rows: Array<{ type: string; amount: string | number }>) {
  return rows.reduce((sums, row) => {
    const value = Number(row.amount) || 0;
    if (row.type.toLowerCase() === "credit") sums.credits += value;
    if (row.type.toLowerCase() === "debit") sums.debits += value;
    return sums;
  }, { credits: 0, debits: 0 });
}

