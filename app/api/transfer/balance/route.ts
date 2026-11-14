import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { getOwnedAccount, maskedAccountNumber } from "@/lib/transfer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const account = await getOwnedAccount(auth.user.id);
  if (!account) return NextResponse.json({ error: "Account unavailable." }, { status: 404 });
  return NextResponse.json({ balance: account.balance, currency: account.currency, accountNumberMasked: maskedAccountNumber(account.accountNumber) }, { headers: { "Cache-Control": "private, no-store" } });
}
