import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, sessions, users } from "@/db/schema";
import { AUTH_COOKIE, readAuthToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  const jwt = request.cookies.get(AUTH_COOKIE)?.value;
  const claims = jwt ? await readAuthToken(jwt) : null;
  if (!claims) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const [session] = await db.select({ id: sessions.id, expiresAt: sessions.expiresAt }).from(sessions).where(and(eq(sessions.id, claims.sid), eq(sessions.userId, claims.sub), eq(sessions.token, claims.jti))).limit(1);
  if (!session || session.expiresAt <= new Date()) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const [user] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, lockedUntil: users.lockedUntil, isActive: users.isActive, status: users.status }).from(users).where(eq(users.id, claims.sub)).limit(1);
  if (!user || !user.isActive || user.status !== "ACTIVE") return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (claims.stage !== "authenticated") return NextResponse.json({ user: { firstName: user.firstName, lastName: user.lastName, initials: `${user.firstName.trim().charAt(0)}${user.lastName.trim().charAt(0)}`.toUpperCase() }, pinLockedUntil: user.lockedUntil });
  const [account] = await db.select({ accountNumber: accounts.accountNumber, accountType: accounts.accountType, currency: accounts.currency, balance: accounts.balance, status: accounts.status }).from(accounts).where(eq(accounts.userId, user.id)).limit(1);
  return NextResponse.json({ user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email }, account: account ?? null });
}
