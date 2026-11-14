import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { getActiveDepositWallets } from "@/lib/deposit-wallets";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const wallets = await getActiveDepositWallets();
    const id = request.nextUrl.searchParams.get("id");
    return NextResponse.json({ wallets: id ? wallets.filter((wallet) => wallet.id === id) : wallets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Deposit methods are unavailable." }, { status: 503 });
  }
}
