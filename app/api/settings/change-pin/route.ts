import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { securityLogs, users } from "@/db/schema";
import { AUTH_COOKIE, requestIp } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { createNotification } from "@/lib/notifications";

const blockedPins = new Set(["0000", "1234", "1111"]);

export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "PIN settings are unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null) as { newPin?: unknown; currentPassword?: unknown } | null;
  const newPin = typeof body?.newPin === "string" ? body.newPin : "";
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  if (!/^\d{4}$/.test(newPin) || blockedPins.has(newPin)) return NextResponse.json({ error: "Choose a 4-digit PIN other than 0000, 1234, or 1111." }, { status: 400 });
  if (!currentPassword) return NextResponse.json({ error: "Enter your current password to continue." }, { status: 400 });
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, auth.user.id)).limit(1);
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  try {
    const pinHash = await bcrypt.hash(newPin, 10);
    await db.update(users).set({ pinHash, updatedAt: new Date() }).where(eq(users.id, auth.user.id));
    await db.insert(securityLogs).values({ userId: auth.user.id, action: "pin_changed", ipAddress: requestIp(request).slice(0, 64), userAgent: request.headers.get("user-agent")?.slice(0, 1000) ?? null });
    await createNotification(auth.user.id, { type: "security", title: "Transaction PIN Updated", message: "Your transaction PIN was successfully updated.", link: "/profile" });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "PIN could not be updated. Please try again." }, { status: 500 });
  }
}
