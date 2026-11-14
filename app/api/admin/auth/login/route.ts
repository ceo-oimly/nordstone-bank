import { and, eq, gt, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminSessions, loginAttempts, users } from "@/db/schema";
import { ADMIN_COOKIE } from "@/lib/admin-auth";
import { signAdminToken } from "@/lib/admin-token";
import { cookieOptions, requestIp } from "@/lib/auth";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!db || !process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return NextResponse.json({ error: "Sign in is unavailable." }, { status: 503 });
  const ip = requestIp(request).slice(0,64); const since = new Date(Date.now()-15*60*1000);
  const [{ value }] = await db.select({ value: count() }).from(loginAttempts).where(and(eq(loginAttempts.ipAddress,ip),gt(loginAttempts.attemptedAt,since)));
  if (value >= 5) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  await db.insert(loginAttempts).values({ ipAddress: ip });
  const body = await request.json().catch(()=>null) as {email?:unknown;password?:unknown}|null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""; const password = typeof body?.password === "string" ? body.password : "";
  const [user] = await db.select({id:users.id,email:users.email,passwordHash:users.passwordHash,role:users.role,status:users.status,isActive:users.isActive}).from(users).where(eq(users.email,email)).limit(1);
  const match = user ? await bcrypt.compare(password,user.passwordHash) : (await bcrypt.hash("constant-time-placeholder",12),false);
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE" || !user.isActive || !match) return NextResponse.json({error:"Invalid credentials"},{status:401});
  const expiresAt = new Date(Date.now()+8*60*60*1000); const id = randomUUID(); const token = randomUUID();
  await db.insert(adminSessions).values({id,userId:user.id,token,expiresAt,ipAddress:ip,userAgent:request.headers.get("user-agent")?.slice(0,2000)??null});
  const jwt = await signAdminToken(user.id,id,token,expiresAt); const response = NextResponse.json({success:true,redirect:"/meridian-secure-admin-portal/dashboard"});
  response.cookies.set(ADMIN_COOKIE,jwt,{...cookieOptions,expires:expiresAt,maxAge:8*60*60}); return response;
}
