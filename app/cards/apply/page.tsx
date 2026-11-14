import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import AppShell from "@/components/layout/AppShell";
import CardApplyForm from "@/components/cards/CardApplyForm";
import { db } from "@/db";
import { currencies, notifications, siteSettings } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function ApplyForCardPage() {
  const auth = await authenticatedSession(cookies().get(AUTH_COOKIE)?.value);
  if (!auth) redirect("/login");
  const [currencyRows, feeRows, unreadRows] = db ? await Promise.all([
    db.select({ code: currencies.code, name: currencies.name }).from(currencies).where(eq(currencies.isActive, true)).orderBy(currencies.sortOrder),
    db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, "card_issuance_fee")).limit(1),
    db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, auth.user.id), eq(notifications.isRead, false))).limit(100),
  ]) : [[], [], []];
  const fee = feeRows[0]?.value || "0";
  return <AppShell unreadCount={unreadRows.length}><CardApplyForm currencies={currencyRows} holderName={`${auth.user.firstName}${auth.user.lastName ? ` ${auth.user.lastName}` : ""}`} fee={fee}/></AppShell>;
}
