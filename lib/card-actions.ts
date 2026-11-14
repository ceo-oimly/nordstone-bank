import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";

export async function updateOwnedCardStatus(request: NextRequest, cardId: string, from: string, to: string, activate = false) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Card controls are unavailable." }, { status: 503 });
  const set: { status: string; isActive?: boolean; activatedAt?: Date } = { status: to };
  if (activate) { set.isActive = true; set.activatedAt = new Date(); }
  if (to === "frozen") set.isActive = false;
  if (to === "active" && from === "frozen") set.isActive = true;
  const [updated] = await db.update(cards).set(set).where(and(eq(cards.id, cardId), eq(cards.userId, auth.user.id), eq(cards.status, from))).returning({ id: cards.id, status: cards.status, isActive: cards.isActive });
  if (!updated) return NextResponse.json({ error: "Card not found or its current status does not allow this action." }, { status: 404 });
  return NextResponse.json({ success: true, card: updated }, { headers: { "Cache-Control": "private, no-store" } });
}
