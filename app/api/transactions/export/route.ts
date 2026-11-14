import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { AUTH_COOKIE } from "@/lib/auth";
import { authenticatedSession } from "@/lib/server-auth";
import { getFilteredTransactions, parseTransactionFilters, sumByType } from "@/lib/transactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  let text = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvResponse(rows: Awaited<ReturnType<typeof getFilteredTransactions>>["rows"]) {
  const headers = ["Date", "Type", "Description", "Counterparty", "Reference", "Amount", "Currency", "Status"];
  const lines = [headers, ...rows.map((r) => [r.createdAt, r.type, r.description, r.recipientName || r.counterpartyName, r.reference, r.amount, r.currency, r.status])];
  return lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

async function pdfBuffer(options: { rows: Awaited<ReturnType<typeof getFilteredTransactions>>["rows"]; name: string; account: string; from: string; to: string; style: string }) {
  const { rows, name, account, from, to, style } = options;
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => { doc.on("data", (chunk: Buffer) => chunks.push(chunk)); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  const accent = style === "classic" ? "#222222" : "#0a0aff";
  doc.fillColor(accent).fontSize(20).font("Helvetica-Bold").text("NORDSTONE BANK - Account Statement");
  doc.moveDown(0.5).fillColor("#444444").fontSize(10).font("Helvetica").text(`Account holder: ${name}`).text(`Account: ${account}`).text(`Period: ${from} to ${to}`);
  doc.moveDown(1);
  const columns = [42, 113, 163, 270, 390, 465];
  const drawHeader = () => {
    const y = doc.y;
    doc.fillColor(accent).font("Helvetica-Bold").fontSize(8);
    ["Date", "Type", "Description", "Reference", "Amount"].forEach((label, i) => doc.text(label, columns[i], y, { width: columns[i + 1] - columns[i] - 4 }));
    doc.moveTo(42, y + 15).lineTo(553, y + 15).strokeColor(accent).stroke();
    doc.y = y + 22;
  };
  drawHeader();
  doc.font("Helvetica").fontSize(8).fillColor("#222222");
  for (const row of rows) {
    if (doc.y > 745) { doc.addPage(); drawHeader(); doc.font("Helvetica").fontSize(8).fillColor("#222222"); }
    const y = doc.y;
    const date = new Date(row.createdAt).toLocaleDateString("en-GB", { timeZone: "UTC" });
    const values = [date, row.type, row.description || row.recipientName || row.counterpartyName || "Transaction", row.reference, `${row.currency} ${Number(row.amount).toFixed(2)}`];
    values.forEach((value, i) => doc.text(String(value), columns[i], y, { width: columns[i + 1] - columns[i] - 4, height: 30, ellipsis: true }));
    doc.moveTo(42, y + 17).lineTo(553, y + 17).strokeColor("#e5e7eb").stroke();
    doc.y = y + 22;
  }
  const totals = sumByType(rows as Array<{ type: string; amount: string | number }>);
  if (doc.y > 720) doc.addPage();
  doc.moveDown(1).font("Helvetica-Bold").fontSize(10).fillColor(accent).text(`Credits: ${totals.credits.toFixed(2)}    Debits: ${totals.debits.toFixed(2)}`);
  doc.end();
  return done;
}

export async function GET(request: NextRequest) {
  const auth = await authenticatedSession(request.cookies.get(AUTH_COOKIE)?.value);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Export is unavailable." }, { status: 503 });
  const params = request.nextUrl.searchParams;
  const format = params.get("format")?.toLowerCase();
  if (!["csv", "pdf", "xlsx"].includes(format || "")) return NextResponse.json({ error: "Choose CSV, PDF, or Excel format." }, { status: 400 });
  if (params.get("delivery") === "email") return NextResponse.json({ error: "Email export is not configured yet. Download the statement instead." }, { status: 501 });
  try {
    const filters = parseTransactionFilters(params);
    const { rows } = await getFilteredTransactions(auth.user.id, filters, false);
    const date = new Date().toISOString().slice(0, 10);
    const filename = `statement-${date}.${format === "xlsx" ? "xlsx" : format}`;
    if (format === "csv") return new NextResponse(`\uFEFF${csvResponse(rows)}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "NORDSTONE BANK";
      const sheet = workbook.addWorksheet("Transactions", { views: [{ state: "frozen", ySplit: 1 }] });
      sheet.columns = [{ header: "Date", key: "date", width: 22 }, { header: "Type", key: "type", width: 14 }, { header: "Description", key: "description", width: 34 }, { header: "Counterparty", key: "counterparty", width: 26 }, { header: "Reference", key: "reference", width: 28 }, { header: "Amount", key: "amount", width: 16 }, { header: "Currency", key: "currency", width: 12 }, { header: "Status", key: "status", width: 14 }];
      sheet.addRows(rows.map((row) => ({ date: row.createdAt, type: row.type, description: row.description || "", counterparty: row.recipientName || row.counterpartyName || "", reference: row.reference, amount: Number(row.amount), currency: row.currency, status: row.status })));
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: params.get("style") === "classic" ? "FF333333" : "FF0A0AFF" } };
      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
    }
    const [accountRow] = await db.select({ accountNumber: accounts.accountNumber }).from(accounts).where(eq(accounts.userId, auth.user.id)).limit(1);
    const masked = accountRow?.accountNumber ? `••••${accountRow.accountNumber.slice(-4)}` : "••••";
    const buffer = await pdfBuffer({ rows, name: `${auth.user.firstName} ${auth.user.lastName}`, account: masked, from: filters.from, to: filters.to, style: params.get("style") || "modern" });
    return new NextResponse(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Statement export failed. Please try again." }, { status: 500 });
  }
}
