import { and, eq } from "drizzle-orm";
import { verifyAdminToken } from "@/lib/admin-token";
import { db } from "@/db";
import { adminSessions, users } from "@/db/schema";

export const ADMIN_COOKIE = "meridian_admin";
export { verifyAdminToken } from "@/lib/admin-token";
export async function requireAdmin(token?: string | null) {
  if (!db || !token) return null;
  const claims = await verifyAdminToken(token);
  if (!claims) return null;
  const [session] = await db.select({ id: adminSessions.id, userId: adminSessions.userId, expiresAt: adminSessions.expiresAt }).from(adminSessions).where(and(eq(adminSessions.id, claims.sessionId), eq(adminSessions.userId, claims.userId), eq(adminSessions.token, claims.token))).limit(1);
  if (!session || session.expiresAt <= new Date()) return null;
  const [user] = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, role: users.role, status: users.status, isActive: users.isActive }).from(users).where(eq(users.id, claims.userId)).limit(1);
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE" || !user.isActive) return null;
  return { user, session };
}
export async function auditAdmin(adminUserId: string, action: string, targetUserId?: string | null, note?: string | null, metadata?: unknown) {
  if (!db) return;
  const { adminAuditLogs } = await import("@/db/schema");
  await db.insert(adminAuditLogs).values({ adminUserId, targetUserId: targetUserId ?? null, action, note: note ?? null, metadata: metadata === undefined ? null : JSON.stringify(metadata) });
}
