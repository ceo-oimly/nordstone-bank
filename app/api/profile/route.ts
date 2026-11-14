import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Profile is unavailable." }, { status: 503 });
  const [[profile], [account]] = await Promise.all([
    db.select({ firstName: users.firstName, lastName: users.lastName, email: users.email, dateOfBirth: users.dateOfBirth, phone: users.phone, address: users.address, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, auth.user.id)).limit(1),
    db.select({ accountNumber: accounts.accountNumber, status: accounts.status }).from(accounts).where(eq(accounts.userId, auth.user.id)).limit(1),
  ]);
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  const initials = `${profile.firstName.trim().charAt(0)}${profile.lastName.trim().charAt(0)}`.toUpperCase();
  const accountNumber = account?.accountNumber ?? "";
  return NextResponse.json({ user: { ...profile, initials }, account: { accountNumber, accountNumberMasked: accountNumber ? `••••••${accountNumber.slice(-4)}` : "", status: account?.status ?? "unavailable" } }, { headers: { "Cache-Control": "private, no-store" } });
}
