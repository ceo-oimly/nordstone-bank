import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, requireAdmin } from "@/lib/admin-auth";
import AdminTicketsClient from "./tickets-client";
export const dynamic = "force-dynamic";
export default async function AdminTickets(){ if (!(await requireAdmin(cookies().get(ADMIN_COOKIE)?.value))) redirect("/meridian-secure-admin-portal/login"); return <AdminTicketsClient/>; }
