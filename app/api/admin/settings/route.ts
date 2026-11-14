import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminWalletConfigs, currencies, siteSettings } from "@/db/schema";
import { ADMIN_COOKIE, auditAdmin, requireAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  if (!await requireAdmin(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const [wallets, supportedCurrencies, email, phone] = await Promise.all([
    db.select().from(adminWalletConfigs).orderBy(asc(adminWalletConfigs.name)),
    db.select().from(currencies).orderBy(asc(currencies.sortOrder)),
    db.select().from(siteSettings).where(eq(siteSettings.key, "support_email")),
    db.select().from(siteSettings).where(eq(siteSettings.key, "support_phone")),
  ]);
  return NextResponse.json({ settings: { supportEmail: email[0]?.value ?? "", supportPhone: phone[0]?.value ?? "" }, wallets, currencies: supportedCurrencies });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (body?.kind === "wallet") {
    if (typeof body.name !== "string" || typeof body.symbol !== "string" || typeof body.network !== "string" || typeof body.address !== "string" || !body.name.trim() || !body.address.trim()) return NextResponse.json({ error: "Wallet name, network, symbol, and address are required." }, { status: 400 });
    const values = { name: body.name.trim().slice(0, 100), symbol: body.symbol.trim().toUpperCase().slice(0, 12), network: body.network.trim().slice(0, 100), address: body.address.trim().slice(0, 1000), icon: typeof body.icon === "string" ? body.icon.slice(0, 8) : "◈", paymentUriPrefix: typeof body.paymentUriPrefix === "string" ? body.paymentUriPrefix.slice(0, 80) : null, isActive: body.isActive !== false, updatedAt: new Date() };
    if (typeof body.id === "string") await db.update(adminWalletConfigs).set(values).where(eq(adminWalletConfigs.id, body.id));
    else await db.insert(adminWalletConfigs).values(values);
    await auditAdmin(admin.user.id, "wallet_config", null, "Wallet settings updated", { symbol: values.symbol });
    return NextResponse.json({ success: true });
  }
  if (body?.kind === "support") {
    if (typeof body.email !== "string" || body.email.length > 320 || typeof body.phone !== "string" || body.phone.length > 80) return NextResponse.json({ error: "Enter a valid support email and phone." }, { status: 400 });
    for (const [key, value] of [["support_email", body.email.trim()], ["support_phone", body.phone.trim()]] as const) await db.insert(siteSettings).values({ key, value, updatedAt: new Date() }).onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
    await auditAdmin(admin.user.id, "support_contact", null, "Support contact updated");
    return NextResponse.json({ success: true });
  }
  if (body?.kind === "currency") {
    if (typeof body.code !== "string" || typeof body.name !== "string" || !/^[A-Z]{3}$/.test(body.code.toUpperCase())) return NextResponse.json({ error: "Enter a three-letter currency code and name." }, { status: 400 });
    await db.insert(currencies).values({ code: body.code.toUpperCase(), name: body.name.trim(), flagEmoji: "", isActive: body.isActive !== false, sortOrder: 0 }).onConflictDoUpdate({ target: currencies.code, set: { name: body.name.trim(), isActive: body.isActive !== false } });
    await auditAdmin(admin.user.id, "currency_config", null, "Currency settings updated", { code: body.code.toUpperCase() });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Invalid settings action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!db) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const id = req.nextUrl.searchParams.get("walletId");
  if (!id) return NextResponse.json({ error: "Wallet id required" }, { status: 400 });
  const [wallet] = await db.delete(adminWalletConfigs).where(eq(adminWalletConfigs.id, id)).returning({ symbol: adminWalletConfigs.symbol });
  if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  await auditAdmin(admin.user.id, "wallet_removed", null, "Receiving wallet removed", { symbol: wallet.symbol });
  return NextResponse.json({ success: true });
}
