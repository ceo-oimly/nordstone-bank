import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { pinAttempts, sessions, users } from "@/db/schema";
import { AUTH_COOKIE, cookieOptions, readAuthToken, requestIp, signAuthToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!db) return NextResponse.json({ error: "PIN verification is temporarily unavailable." }, { status: 503 });
  const jwt = request.cookies.get(AUTH_COOKIE)?.value;
  const claims = jwt ? await readAuthToken(jwt) : null;
  if (!claims || claims.stage !== "pin") return NextResponse.json({ error: "Your sign-in session expired. Please sign in again." }, { status: 401 });

  const [session] = await db.select().from(sessions).where(and(eq(sessions.id, claims.sid), eq(sessions.userId, claims.sub), eq(sessions.token, claims.jti))).limit(1);
  if (!session || session.expiresAt <= new Date()) return NextResponse.json({ error: "Your sign-in session expired. Please sign in again." }, { status: 401 });
  const [user] = await db.select({ id: users.id, pinHash: users.pinHash, lockedUntil: users.lockedUntil }).from(users).where(eq(users.id, claims.sub)).limit(1);
  if (!user?.pinHash) return NextResponse.json({ error: "PIN verification is unavailable. Please contact support." }, { status: 400 });
  if (user.lockedUntil && user.lockedUntil > new Date()) return NextResponse.json({ error: "Too many attempts. Try again in 5 minutes.", lockedUntil: user.lockedUntil }, { status: 423 });

  const body = await request.json().catch(() => null) as { pin?: unknown } | null;
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const ip = requestIp(request).slice(0, 64);
  if (!/^\d{4}$/.test(pin) || !(await bcrypt.compare(pin, user.pinHash))) {
    await db.insert(pinAttempts).values({ userId: user.id, success: false, ipAddress: ip });
    const since = new Date(Date.now() - 5 * 60 * 1000);
    const [{ value: wrongAttempts }] = await db.select({ value: count() }).from(pinAttempts).where(and(eq(pinAttempts.userId, user.id), eq(pinAttempts.success, false), gt(pinAttempts.attemptedAt, since)));
    if (wrongAttempts >= 3) {
      const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
      await db.update(users).set({ lockedUntil, updatedAt: new Date() }).where(eq(users.id, user.id));
      return NextResponse.json({ error: "Too many attempts. Try again in 5 minutes.", lockedUntil }, { status: 423 });
    }
    return NextResponse.json({ error: "That PIN is incorrect. Please try again." }, { status: 401 });
  }

  await db.insert(pinAttempts).values({ userId: user.id, success: true, ipAddress: ip });
  await db.update(users).set({ lockedUntil: null, updatedAt: new Date() }).where(eq(users.id, user.id));
  const nextToken = randomUUID();
  await db.update(sessions).set({ token: nextToken }).where(eq(sessions.id, session.id));
  const nextJwt = await signAuthToken({ sub: user.id, sid: session.id, jti: nextToken, stage: "authenticated" }, session.expiresAt);
  const response = NextResponse.json({ success: true, redirect: "/dashboard" });
  response.cookies.set(AUTH_COOKIE, nextJwt, { ...cookieOptions, expires: session.expiresAt, maxAge: Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)) });
  return response;
}
