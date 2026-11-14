import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, deposits, transactions } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { getActiveDepositWallets } from "@/lib/deposit-wallets";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const maxProofBytes = 5 * 1024 * 1024;

function validFile(bytes: Buffer, type: string) {
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "application/pdf") return bytes.toString("ascii", 0, 5) === "%PDF-";
  return false;
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Deposits are unavailable." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const amountRaw = form?.get("amount");
  const walletIdRaw = form?.get("walletId");
  const proof = form?.get("proof");
  const amountText = typeof amountRaw === "string" ? amountRaw.trim() : "";
  const walletId = typeof walletIdRaw === "string" ? walletIdRaw.trim() : "";
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(amountText) || Number(amountText) <= 0) return NextResponse.json({ error: "Enter a valid deposit amount." }, { status: 400 });
  if (!(proof instanceof File)) return NextResponse.json({ error: "Upload your payment proof before submitting." }, { status: 400 });
  if (proof.size === 0 || proof.size > maxProofBytes) return NextResponse.json({ error: "Payment proof must be no larger than 5 MB." }, { status: 400 });
  if (!["image/png", "image/jpeg", "application/pdf"].includes(proof.type)) return NextResponse.json({ error: "Upload a PNG, JPG, or PDF file." }, { status: 400 });
  const proofBuffer = Buffer.from(await proof.arrayBuffer());
  if (!validFile(proofBuffer, proof.type)) return NextResponse.json({ error: "The file contents do not match the selected proof type." }, { status: 400 });
  try {
    const wallets = await getActiveDepositWallets();
    const wallet = wallets.find((entry) => entry.id === walletId);
    if (!wallet) return NextResponse.json({ error: "That deposit method is no longer available." }, { status: 400 });
    const [account] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.userId, auth.user.id)).limit(1);
    if (!account) return NextResponse.json({ error: "Your account is not available for deposits." }, { status: 400 });

    const reference = `DEP-${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`;
    const [deposit] = await db.insert(deposits).values({ userId: auth.user.id, accountId: account.id, walletId: wallet.id, methodName: wallet.name, network: wallet.network, walletAddress: wallet.address, amount: Number(amountText).toFixed(2), currency: "USD", reference, proofFilename: proof.name.replace(/[\r\n"\\/]/g, "_").slice(0, 255) || "payment-proof", proofContentType: proof.type, proofData: proofBuffer.toString("base64"), status: "pending" }).returning({ id: deposits.id, reference: deposits.reference });
    try {
      await db.insert(transactions).values({ userId: auth.user.id, accountId: account.id, type: "credit", amount: Number(amountText).toFixed(2), currency: "USD", status: "pending", description: `Deposit submitted via ${wallet.name}`, counterpartyName: wallet.name, reference: deposit.reference });
    } catch (error) {
      await db.delete(deposits).where(and(eq(deposits.id, deposit.id), eq(deposits.userId, auth.user.id))).catch(() => undefined);
      throw error;
    }
    await createNotification(auth.user.id, { type: "deposit", title: "Deposit Submitted", message: `Your USD ${Number(amountText).toFixed(2)} deposit is pending review.`, link: "/transactions" });
    return NextResponse.json({ success: true, depositId: deposit.id, reference: deposit.reference, status: "pending" }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Your deposit could not be submitted. Please try again." }, { status: 500 });
  }
}
