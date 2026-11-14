import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { AUTH_COOKIE, cookieOptions, readAuthToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const jwt = request.cookies.get(AUTH_COOKIE)?.value;
  const claims = jwt ? await readAuthToken(jwt) : null;
  if (db && claims) await db.delete(sessions).where(eq(sessions.id, claims.sid));
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, "", { ...cookieOptions, expires: new Date(0), maxAge: 0 });
  return response;
}
