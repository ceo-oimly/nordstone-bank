import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import AppShell from "@/components/layout/AppShell";
import SendMoneyModal from "@/components/transfer/SendMoneyModal";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function TransferPickerPage() {
  const auth = await authenticatedSession(cookies().get(AUTH_COOKIE)?.value);
  if (!auth) redirect("/login");
  const [unread] = db ? await db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, auth.user.id), eq(notifications.isRead, false))) : [{ value: 0 }];
  return <AppShell unreadCount={Number(unread?.value || 0)}><SendMoneyModal/></AppShell>;
}
