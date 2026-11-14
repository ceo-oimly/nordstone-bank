import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { AUTH_COOKIE } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-data";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = cookies();
  const auth = await authenticatedSession(cookieStore.get(AUTH_COOKIE)?.value);
  if (!auth) redirect("/login");
  const data = await getDashboardData(auth.user);
  if (!data) redirect("/login");
  return <AppShell unreadCount={data.unreadNotifications}><DashboardContent data={data}/></AppShell>;
}
