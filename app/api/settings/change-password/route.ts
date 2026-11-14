import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { passwordHistory, securityLogs, sessions, users } from "@/db/schema";
import { AUTH_COOKIE, requestIp } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { createNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Password settings are unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown; confirmPassword?: unknown } | null;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  if (!currentPassword || !newPassword || !confirmPassword) return NextResponse.json({ error: "Complete all password fields." }, { status: 400 });
  if (newPassword.length < 8 || newPassword.length > 200 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) return NextResponse.json({ error: "New password must be at least 8 characters and include lowercase, uppercase, and a number." }, { status: 400 });
  if (newPassword !== confirmPassword) return NextResponse.json({ error: "The new password and confirmation do not match." }, { status: 400 });
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, auth.user.id)).limit(1);
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  if (await bcrypt.compare(newPassword, user.passwordHash)) return NextResponse.json({ error: "Choose a password different from your current password." }, { status: 400 });
  const history = await db.select({ passwordHash: passwordHistory.passwordHash }).from(passwordHistory).where(eq(passwordHistory.userId, auth.user.id)).orderBy(desc(passwordHistory.createdAt)).limit(3);
  for (const entry of history) if (await bcrypt.compare(newPassword, entry.passwordHash)) return NextResponse.json({ error: "You cannot reuse any of your last 3 passwords." }, { status: 400 });
  const passwordHash = await bcrypt.hash(newPassword, 12);
  try {
    await db.insert(passwordHistory).values({ userId: auth.user.id, passwordHash: user.passwordHash });
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, auth.user.id));
    await db.insert(securityLogs).values({ userId: auth.user.id, action: "password_changed", ipAddress: requestIp(request).slice(0, 64), userAgent: request.headers.get("user-agent")?.slice(0, 1000) ?? null });
    await db.delete(sessions).where(eq(sessions.userId, auth.user.id));
    await createNotification(auth.user.id, { type: "security", title: "Password Changed", message: "Your account password was changed. You will need to sign in again on your devices.", link: "/profile" });
    return NextResponse.json({ success: true, message: "Password updated. Please log in again." }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Password could not be updated. Please try again." }, { status: 500 });
  }
}
