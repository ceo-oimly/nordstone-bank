import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/admin-token";

const base = "/meridian-secure-admin-portal";
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLogin = path === `${base}/login` || path === "/api/admin/auth/login";
  if (isLogin) return NextResponse.next();
  const claims = await verifyAdminToken(request.cookies.get("meridian_admin")?.value ?? "");
  if (!claims) return path.startsWith("/api/") ? NextResponse.json({ error: "Not found" }, { status: 404 }) : NextResponse.rewrite(new URL("/404", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/meridian-secure-admin-portal/:path*", "/api/admin/:path*"] };
