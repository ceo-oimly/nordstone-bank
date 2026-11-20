import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, requireAdmin } from "@/lib/admin-auth";
import AdminTicketClient from "./ticket-client";
export const dynamic = "force-dynamic";
export default async function AdminTicket({params}:{params:{id:string}}){if(!(await requireAdmin(cookies().get(ADMIN_COOKIE)?.value)))redirect("/meridian-secure-admin-portal/login");return <AdminTicketClient ticketId={params.id}/>}
