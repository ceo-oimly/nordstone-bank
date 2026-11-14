import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { accounts, currencies, transferAttempts, users } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { getFxRate, getOwnedAccount } from "@/lib/transfer";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type ConfirmBody = {
  amount?: unknown; recipientName?: unknown; recipientAccountNumber?: unknown; recipientBank?: unknown;
  transferType?: unknown; description?: unknown; pin?: unknown; country?: unknown; currency?: unknown;
  swift?: unknown; iban?: unknown; purpose?: unknown;
};

function randomReference(prefix: "TRF" | "CRD") {
  return `${prefix}${randomInt(0, 10_000_000_000).toString().padStart(10, "0")}`;
}

async function logFailure(userId: string, reason: string) {
  if (db) await db.insert(transferAttempts).values({ userId, success: false, reason });
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Transfer unavailable." }, { status: 503 });

  const body = await request.json().catch(() => null) as ConfirmBody | null;
  const amountText = typeof body?.amount === "string" || typeof body?.amount === "number" ? String(body.amount) : "";
  const recipientName = typeof body?.recipientName === "string" ? body.recipientName.trim() : "";
  const recipientAccountNumber = typeof body?.recipientAccountNumber === "string" ? body.recipientAccountNumber.trim() : "";
  const recipientBank = typeof body?.recipientBank === "string" ? body.recipientBank.trim() : "";
  const transferType = body?.transferType === "international" ? "international" : body?.transferType === "local" ? "local" : null;
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 1000) : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const country = typeof body?.country === "string" ? body.country.trim().slice(0, 120) : "";
  const requestedCurrency = typeof body?.currency === "string" ? body.currency.toUpperCase() : "";
  const swift = typeof body?.swift === "string" ? body.swift.trim().toUpperCase().slice(0, 20) : "";
  const iban = typeof body?.iban === "string" ? body.iban.replace(/\s/g, "").toUpperCase().slice(0, 64) : "";
  const purpose = typeof body?.purpose === "string" ? body.purpose.trim().slice(0, 120) : "";

  const invalid = !/^\d+(\.\d{1,2})?$/.test(amountText) || Number(amountText) <= 0 || !recipientName || recipientName.length > 180 || !/^[A-Za-z0-9 -]{4,64}$/.test(recipientAccountNumber) || !recipientBank || recipientBank.length > 180 || !transferType || !/^\d{4}$/.test(pin) || (transferType === "international" && (!country || !/^[A-Z]{3}$/.test(requestedCurrency) || !swift || !iban));
  if (invalid) return NextResponse.json({ error: "Unable to complete transfer. Check the transfer details." }, { status: 400 });

  const [user] = await db.select({ pinHash: users.pinHash }).from(users).where(eq(users.id, auth.user.id)).limit(1);
  if (!user?.pinHash || !(await bcrypt.compare(pin, user.pinHash))) {
    await logFailure(auth.user.id, "PIN verification failed");
    return NextResponse.json({ error: "Unable to complete transfer. Check the PIN and transfer details." }, { status: 400 });
  }

  const account = await getOwnedAccount(auth.user.id);
  if (!account) { await logFailure(auth.user.id, "Sender account unavailable"); return NextResponse.json({ error: "Unable to complete transfer." }, { status: 400 }); }
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || Number(account.balance) < amount) {
    await logFailure(auth.user.id, "Insufficient available balance");
    return NextResponse.json({ error: "Unable to complete transfer. Check the amount and available balance." }, { status: 400 });
  }

  const destinationCurrency = transferType === "international" ? requestedCurrency : account.currency;
  if (transferType === "international") {
    const [currencyRow] = await db.select({ code: currencies.code }).from(currencies).where(and(eq(currencies.code, destinationCurrency), eq(currencies.isActive, true))).limit(1);
    if (!currencyRow) return NextResponse.json({ error: "Unable to complete transfer. Check the destination currency." }, { status: 400 });
  }
  const fxRate = transferType === "international" ? await getFxRate(account.currency, destinationCurrency) : 1;
  if (fxRate === null) return NextResponse.json({ error: "A verified exchange rate is not available for this currency pair." }, { status: 503 });
  const recipientAmount = (amount * fxRate).toFixed(2);
  const fee = "0.00";
  const destinationCountry = transferType === "international" ? country : null;
  const finalDescription = [description, purpose ? `Purpose: ${purpose}` : ""].filter(Boolean).join(" · ") || null;

  const [recipient] = await db.select({ id: accounts.id, userId: accounts.userId, currency: accounts.currency }).from(accounts).where(eq(accounts.accountNumber, recipientAccountNumber)).limit(1);
  if (recipient?.userId === auth.user.id || (recipient && recipient.currency !== destinationCurrency)) {
    await logFailure(auth.user.id, "Transfer could not be completed for destination account");
    return NextResponse.json({ error: "Unable to complete transfer. Verify the transfer details and currency." }, { status: 400 });
  }

  const expectedDelivery = new Date(Date.now() + (transferType === "international" ? 72 : 1) * 60 * 60 * 1000);
  const senderName = `${auth.user.firstName} ${auth.user.lastName}`.trim();

  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = randomReference("TRF");
    const creditReference = randomReference("CRD");
    try {
      const result = await db.execute(sql`
        WITH sender_debit AS (
          UPDATE accounts
          SET balance = balance - ${amount.toFixed(2)}::numeric
          WHERE id = ${account.id} AND user_id = ${auth.user.id} AND balance >= ${amount.toFixed(2)}::numeric
          RETURNING id, user_id, balance
        ), recipient_credit AS (
          UPDATE accounts
          SET balance = balance + ${recipientAmount}::numeric
          WHERE id = ${recipient?.id ?? null}::uuid AND user_id <> ${auth.user.id} AND currency = ${destinationCurrency}
            AND EXISTS (SELECT 1 FROM sender_debit)
          RETURNING id, user_id
        ), debit_ledger AS (
          INSERT INTO transactions (user_id, account_id, type, amount, currency, status, description, counterparty_name, reference, transfer_type, destination_country, destination_currency, swift_code, iban, fx_rate, fee, recipient_amount, recipient_name, recipient_account_number, recipient_bank, expected_delivery, created_at)
          SELECT sd.user_id, sd.id, 'debit', ${amount.toFixed(2)}::numeric, ${account.currency},
            CASE WHEN EXISTS (SELECT 1 FROM recipient_credit) THEN 'completed' ELSE 'pending' END,
            ${finalDescription}, ${recipientName}, ${reference}, ${transferType}, ${destinationCountry}, ${destinationCurrency}, ${transferType === "international" ? swift : null}, ${transferType === "international" ? iban : null}, ${transferType === "international" ? fxRate : null}, ${fee}::numeric, ${recipientAmount}::numeric, ${recipientName}, ${recipientAccountNumber}, ${recipientBank},
            CASE WHEN EXISTS (SELECT 1 FROM recipient_credit) THEN NULL ELSE ${expectedDelivery} END, now()
          FROM sender_debit sd RETURNING id
        ), credit_ledger AS (
          INSERT INTO transactions (user_id, account_id, type, amount, currency, status, description, counterparty_name, reference, transfer_type, destination_currency, fee, recipient_amount, recipient_name, recipient_bank, created_at)
          SELECT rc.user_id, rc.id, 'credit', ${recipientAmount}::numeric, ${destinationCurrency}, 'completed', ${finalDescription}, ${senderName}, ${creditReference}, ${transferType}, ${destinationCurrency}, ${fee}::numeric, ${recipientAmount}::numeric, ${senderName}, ${recipientBank}, now()
          FROM recipient_credit rc RETURNING id
        ), beneficiary_saved AS (
          INSERT INTO beneficiaries (user_id, name, account_number, bank_name, country, swift_code, iban, transfer_type, created_at)
          SELECT sd.user_id, ${recipientName}, ${recipientAccountNumber}, ${recipientBank}, ${country || "Local"}, ${transferType === "international" ? swift : null}, ${transferType === "international" ? iban : null}, ${transferType}, now()
          FROM sender_debit sd
          ON CONFLICT (user_id, account_number, transfer_type) DO UPDATE SET name = EXCLUDED.name, bank_name = EXCLUDED.bank_name, country = EXCLUDED.country, swift_code = EXCLUDED.swift_code, iban = EXCLUDED.iban
          RETURNING id
        ), attempt_saved AS (
          INSERT INTO transfer_attempts (user_id, success, reason, attempted_at)
          SELECT sd.user_id, true, NULL, now() FROM sender_debit sd
          RETURNING id
        )
        SELECT balance::text AS new_balance FROM sender_debit
      `);
      const rows = result.rows as Array<{ new_balance: string }>;
      if (!rows.length) {
        await logFailure(auth.user.id, "Insufficient available balance");
        return NextResponse.json({ error: "Unable to complete transfer. Check the amount and available balance." }, { status: 400 });
      }
      const notificationTasks = [createNotification(auth.user.id, { type: "transfer", title: "Transfer Sent", message: `Your transfer of ${account.currency} ${amount.toFixed(2)} to ${recipientName} was submitted.`, link: "/transactions" })];
      if (recipient && recipient.userId !== auth.user.id) notificationTasks.push(createNotification(recipient.userId, { type: "transfer", title: "Transfer Received", message: `You received ${destinationCurrency} ${recipientAmount} from ${senderName}.`, link: "/transactions" }));
      await Promise.all(notificationTasks);
      return NextResponse.json({ success: true, reference, newBalance: rows[0].new_balance });
    } catch (error) {
      const info = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
      const code = info.code ?? info.cause?.code;
      const constraint = info.constraint ?? info.cause?.constraint;
      if (code === "23505" && constraint?.includes("reference")) continue;
      console.error("Transfer confirmation failed:", error);
      await logFailure(auth.user.id, "Database transfer failed");
      return NextResponse.json({ error: "Unable to complete transfer. Please try again." }, { status: 500 });
    }
  }
  await logFailure(auth.user.id, "Could not allocate transfer reference");
  return NextResponse.json({ error: "Unable to complete transfer. Please try again." }, { status: 503 });
}
