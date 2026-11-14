import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import AppShell from "@/components/layout/AppShell";
import DepositHub from "@/components/deposit/DepositHub";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function DepositPage() {
  const auth = await authenticatedSession(cookies().get(AUTH_COOKIE)?.value);
  if (!auth) redirect("/login");
  const unreadCount = db ? (await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, auth.user.id), eq(notifications.isRead, false))).limit(100)).length : 0;
  return <AppShell unreadCount={unreadCount}><DepositHub/></AppShell>;
}
