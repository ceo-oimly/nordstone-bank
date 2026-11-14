import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { getFilteredTransactions, parseTransactionFilters, totalPages } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const filters = parseTransactionFilters(request.nextUrl.searchParams);
    const result = await getFilteredTransactions(auth.user.id, filters);
    return NextResponse.json({ transactions: result.rows, total: result.total, page: filters.page, perPage: filters.perPage, totalPages: totalPages(result.total, filters.perPage) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Transactions could not be loaded." }, { status: 503 });
  }
}
