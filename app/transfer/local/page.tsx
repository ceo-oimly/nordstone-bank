import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import AppShell from "@/components/layout/AppShell";
import TransferForm, { type TransferCurrency } from "@/components/transfer/TransferForm";
import { db } from "@/db";
import { currencies, notifications } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function LocalTransferPage() {
  const auth = await authenticatedSession(cookies().get(AUTH_COOKIE)?.value);
  if (!auth) redirect("/login");
  const [currencyRows, unreadRows] = db ? await Promise.all([
    db.select({ code: currencies.code, name: currencies.name, flagEmoji: currencies.flagEmoji }).from(currencies).where(eq(currencies.isActive, true)),
    db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, auth.user.id), eq(notifications.isRead, false))),
  ]) : [[], [{ value: 0 }]];
  return <AppShell unreadCount={Number(unreadRows[0]?.value || 0)}><TransferForm transferType="local" currencies={currencyRows as TransferCurrency[]}/></AppShell>;
}
