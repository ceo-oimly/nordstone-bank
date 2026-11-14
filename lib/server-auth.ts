import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { readAuthToken } from "@/lib/auth";

export async function authenticatedSession(token: string | undefined) {
  if (!db || !token) return null;
  const claims = await readAuthToken(token);
  if (!claims || claims.stage !== "authenticated") return null;
  const [session] = await db.select({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt }).from(sessions).where(and(eq(sessions.id, claims.sid), eq(sessions.userId, claims.sub), eq(sessions.token, claims.jti))).limit(1);
  if (!session || session.expiresAt <= new Date()) return null;
  const [user] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, createdAt: users.createdAt, isActive: users.isActive, status: users.status, role: users.role }).from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user?.isActive || user.status !== "ACTIVE") return null;
  return { claims, session, user };
}
