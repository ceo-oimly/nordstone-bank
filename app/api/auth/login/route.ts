import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gt, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { loginAttempts, sessions, users } from "@/db/schema";
import { AUTH_COOKIE, cookieOptions, requestIp, signAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "Sign in is temporarily unavailable." }, { status: 503 });
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return NextResponse.json({ error: "Sign in is not configured yet." }, { status: 503 });

  const ip = requestIp(request).slice(0, 64);
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const [{ value: recentAttempts }] = await db.select({ value: count() }).from(loginAttempts).where(and(eq(loginAttempts.ipAddress, ip), gt(loginAttempts.attemptedAt, since)));
  if (recentAttempts >= 5) return NextResponse.json({ error: "Too many login attempts. Try again in 15 minutes." }, { status: 429 });
  await db.insert(loginAttempts).values({ ipAddress: ip });

  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown; rememberMe?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 256) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const [user] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, passwordHash: users.passwordHash, pinHash: users.pinHash, isActive: users.isActive, status: users.status, lockedUntil: users.lockedUntil }).from(users).where(eq(users.email, email)).limit(1);
  const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : (await bcrypt.hash("constant-time-placeholder", 12), false);
  if (!user || !user.isActive || user.status !== "ACTIVE" || !user.pinHash || !passwordMatches || (user.lockedUntil && user.lockedUntil > new Date())) {
    if (user) await db.update(users).set({ failedLoginAttempts: sql`${users.failedLoginAttempts} + 1`, updatedAt: new Date() }).where(eq(users.id, user.id));
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await db.update(users).set({ failedLoginAttempts: 0, updatedAt: new Date() }).where(eq(users.id, user.id));
  const expiresAt = new Date(Date.now() + (body?.rememberMe === true ? 30 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000));
  const sessionId = randomUUID();
  const sessionToken = randomUUID();
  await db.insert(sessions).values({ id: sessionId, userId: user.id, token: sessionToken, expiresAt, ipAddress: ip, userAgent: request.headers.get("user-agent")?.slice(0, 2000) ?? null });
  const jwt = await signAuthToken({ sub: user.id, sid: sessionId, jti: sessionToken, stage: "pin" }, expiresAt);
  const response = NextResponse.json({ needsPin: true, user: { firstName: user.firstName, lastName: user.lastName, initials: `${user.firstName.trim().charAt(0)}${user.lastName.trim().charAt(0)}`.toUpperCase() } });
  response.cookies.set(AUTH_COOKIE, jwt, { ...cookieOptions, expires: expiresAt, maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000) });
  return response;
}
