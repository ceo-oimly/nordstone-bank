"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type TransferType = "local" | "international";
export type TransferCurrency = { code: string; name: string; flagEmoji: string };
type BalanceInfo = { balance: string; currency: string; accountNumberMasked: string };
type Preview = { amount: string; fee: number; total: string; newBalance: string; fxRate?: number; recipientGets?: string; currency?: string };

const countryByCurrency: Record<string, string> = { USD: "United States", EUR: "Eurozone", GBP: "United Kingdom", CAD: "Canada", KRW: "South Korea", JPY: "Japan", CNY: "China", NZD: "New Zealand", CHF: "Switzerland" };
const purposeOptions = ["Family Support", "Business", "Education", "Other"];

function formatMoney(amount: string | number, currency = "USD") {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `— ${currency}`;
  try { return `${new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ${currency}`; }
  catch { return `${value.toFixed(2)} ${currency}`; }
}

export default function TransferForm({ transferType, currencies }: { transferType: TransferType; currencies: TransferCurrency[] }) {
  const router = useRouter();
  const international = transferType === "international";
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null>(null);
  const [balanceError, setBalanceError] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [recipientBank, setRecipientBank] = useState("");
  const [transferChannel, setTransferChannel] = useState("Online Banking");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [swift, setSwift] = useState("");
  const [iban, setIban] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [fxError, setFxError] = useState("");
  const [formError, setFormError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [successReference, setSuccessReference] = useState("");

  const balance = Number(balanceInfo?.balance ?? 0);
  const currencyChoices = useMemo(() => currencies.filter((item) => ["USD", "EUR", "GBP"].includes(item.code)), [currencies]);
  const countryChoices = useMemo(() => currencies.map((item) => ({ ...item, countryName: countryByCurrency[item.code] || item.name })), [currencies]);
  const title = international ? "International Wire Transfer" : "Local Bank Transfer";
  const subtitle = international ? "Send money to any bank worldwide securely" : "Send money to any local bank account securely";

  useEffect(() => {
    let active = true;
    fetch("/api/transfer/balance", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!active) return;
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) { setBalanceError(result.error || "Could not load your balance."); return; }
      setBalanceInfo(result);
      if (!international) setCurrency(result.currency);
      else setCurrency((current) => current || (currencyChoices.find((item) => item.code === "USD")?.code ?? currencyChoices[0]?.code ?? ""));
    }).catch(() => { if (active) setBalanceError("Could not load your balance."); });
    return () => { active = false; };
  }, [international, router, currencyChoices]);

  useEffect(() => {
    if (!international || !balanceInfo?.currency || !currency) return;
    let active = true;
    setFxError(""); setFxRate(null);
    fetch(`/api/rates?from=${encodeURIComponent(balanceInfo.currency)}&to=${encodeURIComponent(currency)}`, { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!active) return;
      if (!response.ok || typeof result.rate !== "number") { setFxError(result.error || "A verified rate is not available."); return; }
      setFxRate(result.rate);
    }).catch(() => { if (active) setFxError("Could not load the exchange rate."); });
    return () => { active = false; };
  }, [international, balanceInfo?.currency, currency]);

  const amountValue = Number(amount);
  const amountError = amount && (!Number.isFinite(amountValue) || amountValue <= 0) ? "Enter an amount greater than zero." : amount && amountValue > balance ? "Amount exceeds your available balance." : "";
  const previewRecipientGets = amountValue > 0 && fxRate !== null ? (amountValue * fxRate).toFixed(2) : "—";

  function useQuickAmount(value: number | "all") {
    if (!balanceInfo) return;
    setAmount(value === "all" ? balanceInfo.balance : Math.min(value, balance).toFixed(2));
  }

  async function openPreview() {
    setFormError("");
    if (!balanceInfo) { setFormError(balanceError || "Your balance is not available."); return; }
    if (!amount || amountValue <= 0 || amountValue > balance) { setFormError(amountError || "Enter a valid transfer amount."); return; }
    if (!recipientName.trim() || !recipientAccountNumber.trim() || !recipientBank.trim()) { setFormError("Complete the beneficiary details to continue."); return; }
    if (international && (!country || !currency || !swift.trim() || !iban.trim())) { setFormError("Complete all international wire details to continue."); return; }
    if (!/^\d{4}$/.test(pin)) { setFormError("Enter your 4-digit transaction PIN."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/transfer/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, transferType, currency: international ? currency : balanceInfo.currency }) });
      const result = await response.json();
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) { setFormError(result.error || "Unable to prepare transfer preview."); return; }
      setPreview(result);
      setPreviewOpen(true);
    } catch { setFormError("Unable to prepare transfer preview. Try again."); }
    finally { setBusy(false); }
  }

  async function confirmTransfer() {
    if (!preview) return;
    setBusy(true); setFormError("");
    try {
      const response = await fetch("/api/transfer/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, recipientName, recipientAccountNumber, recipientBank, transferType, description, pin, country, currency: international ? currency : balanceInfo?.currency, swift, iban, purpose: international ? purpose : transferChannel }) });
      const result = await response.json();
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) { setFormError(result.error || "Unable to complete transfer."); return; }
      setSuccessReference(result.reference);
      setPreviewOpen(false);
    } catch { setFormError("Unable to complete transfer. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  const titleForCrumb = international ? "International Transfer" : "Local Transfer";

  return <main className="transfer-page">
    <div className="transfer-breadcrumb"><a href="/dashboard">Dashboard</a><span>›</span><strong>{titleForCrumb}</strong></div>
    <section className="transfer-hero"><span className="transfer-hero-icon">➤</span><div><h1>{title}</h1><p>{subtitle}</p></div></section>
    <section className="transfer-balance-card"><span className="wallet-icon">▣</span><span><small>Available Balance</small><strong>{balanceInfo ? formatMoney(balanceInfo.balance, balanceInfo.currency) : balanceError || "Loading balance…"}</strong></span><a href="/dashboard">Back to Dashboard</a></section>

    <section className="transfer-panel"><div className="transfer-panel-heading"><span className="panel-icon amount-icon">$</span><div><h2>Transfer Amount</h2><p>Enter the amount you want to send</p></div></div><label className="amount-entry"><span>{balanceInfo?.currency === "EUR" ? "€" : balanceInfo?.currency === "GBP" ? "£" : "$"}</span><input inputMode="decimal" type="text" pattern="[0-9]*[.]?[0-9]{0,2}" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1").replace(/^(\d+\.\d{0,2}).*$/, "$1"))} aria-label="Transfer amount"/><small>{balanceInfo?.currency || "USD"}</small></label>{amountError && <p className="transfer-inline-error">{amountError}</p>}<div className="quick-amounts"><span>Quick amount</span>{[100, 500, 1000].map((value) => <button type="button" key={value} onClick={() => useQuickAmount(value)}>${value}</button>)}<button type="button" onClick={() => useQuickAmount("all")}>All</button></div></section>

    <section className="transfer-panel"><div className="transfer-panel-heading"><span className="panel-icon person-icon">♙</span><div><h2>Beneficiary Details</h2><p>Enter the bank details for your recipient</p></div></div><div className="transfer-fields-grid">
      <TransferField label="Beneficiary Account Name"><span className="field-leading">♙</span><input autoComplete="off" placeholder="Account holder name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)}/></TransferField>
      <TransferField label="Beneficiary Account Number"><span className="field-leading">#</span><input autoComplete="off" placeholder="Account number" value={recipientAccountNumber} onChange={(e) => setRecipientAccountNumber(e.target.value)}/></TransferField>
      <TransferField label="Bank Name"><span className="field-leading">▤</span><input autoComplete="off" placeholder="Recipient bank" value={recipientBank} onChange={(e) => setRecipientBank(e.target.value)}/></TransferField>
      <TransferField label="Transfer Type"><span className="field-leading">⇄</span><select value={transferChannel} onChange={(e) => setTransferChannel(e.target.value)}><option>Online Banking</option><option>Mobile Banking</option></select></TransferField>
      {international && <>
        <TransferField label="Country"><span className="field-leading">◎</span><select value={country} onChange={(e) => setCountry(e.target.value)}><option value="">Select a destination</option>{countryChoices.map((item) => <option value={item.countryName} key={item.code}>{item.flagEmoji} {item.countryName} ({item.code})</option>)}</select></TransferField>
        <TransferField label="Currency"><span className="field-leading">¤</span><select value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="">Select currency</option>{currencyChoices.map((item) => <option key={item.code} value={item.code}>{item.flagEmoji} {item.code} — {item.name}</option>)}</select></TransferField>
        <TransferField label="SWIFT / BIC Code"><span className="field-leading">⌗</span><input autoComplete="off" placeholder="Bank SWIFT / BIC" value={swift} onChange={(e) => setSwift(e.target.value.toUpperCase().slice(0, 20))}/></TransferField>
        <TransferField label="IBAN"><span className="field-leading">▤</span><input autoComplete="off" placeholder="International account number" value={iban} onChange={(e) => setIban(e.target.value.toUpperCase().slice(0, 64))}/></TransferField>
        <TransferField label="Purpose of Transfer"><span className="field-leading">ⓘ</span><select value={purpose} onChange={(e) => setPurpose(e.target.value)}><option value="">Select purpose</option>{purposeOptions.map((option) => <option key={option}>{option}</option>)}</select></TransferField>
      </>}
    </div>
    {international && <div className="fx-summary"><div><span>Exchange Rate</span><strong>{fxRate === null ? fxError || "Loading live rate…" : `1 ${balanceInfo?.currency} = ${fxRate.toFixed(6)} ${currency}`}</strong></div><div><span>Fee</span><strong>{formatMoney(0, balanceInfo?.currency || "USD")}</strong></div><div><span>Recipient Gets</span><strong>{fxRate === null ? "—" : formatMoney(previewRecipientGets, currency || "USD")}</strong></div><div><span>Delivery</span><strong>Under 72 hours</strong></div></div>}</section>

    <section className="transfer-panel"><div className="transfer-panel-heading"><span className="panel-icon info-icon">i</span><div><h2>Additional Information</h2><p>Add a note and verify with your transaction PIN</p></div></div><label className="transfer-textarea-label">Description / Memo<textarea maxLength={1000} placeholder="Enter transaction description or purpose of payment" value={description} onChange={(e) => setDescription(e.target.value)}/></label><TransferField label="Transaction PIN"><span className="field-leading">♙</span><input type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="off" maxLength={4} placeholder="4-digit PIN" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}/><button type="button" className="transfer-eye" onClick={() => setShowPin(!showPin)} aria-label={showPin ? "Hide PIN" : "Show PIN"}>{showPin ? "◉" : "◎"}</button></TransferField><small className="pin-note">This is your transaction PIN, not your login password.</small></section>

    {formError && <div className="transfer-error" role="alert">{formError}</div>}
    <div className="transfer-actions"><button type="button" className="transfer-preview-button" disabled={busy} onClick={() => void openPreview()}>{busy ? "Please wait…" : "Preview Transfer"} <b>→</b></button><a href="/dashboard">Back to Dashboard</a></div>

    {previewOpen && preview && <div className="transfer-modal-backdrop" onClick={() => !busy && setPreviewOpen(false)}><section className="confirm-transfer-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-transfer-title" onClick={(e) => e.stopPropagation()}><button type="button" className="transfer-modal-close" aria-label="Close" onClick={() => setPreviewOpen(false)}>×</button><div className="confirm-modal-icon">✓</div><h2 id="confirm-transfer-title">Confirm Transfer Details</h2><p className="confirm-modal-subtitle">Review the details before you send</p>
      {successReference ? <div className="transfer-success"><div className="transfer-success-check">✓</div><h3>Transfer submitted</h3><p>Your reference</p><strong>{successReference}</strong><small>External transfers remain pending until processed.</small><button type="button" onClick={() => router.push("/dashboard")}>Done</button></div> : <>
        <div className="transfer-summary"><SummaryRow label="Amount" value={formatMoney(preview.amount, balanceInfo?.currency || "USD")}/><SummaryRow label="Recipient" value={recipientName}/><SummaryRow label="Account Number" value={recipientAccountNumber}/><SummaryRow label="Bank" value={recipientBank}/><SummaryRow label="Transfer Type" value={transferChannel}/>{international && <><SummaryRow label="Country" value={country}/><SummaryRow label="SWIFT" value={swift}/><SummaryRow label="IBAN" value={iban}/><SummaryRow label="Exchange Rate" value={preview.fxRate ? `1 ${balanceInfo?.currency} = ${preview.fxRate.toFixed(6)} ${currency}` : "—"}/><SummaryRow label="Fee" value={formatMoney(preview.fee, balanceInfo?.currency || "USD")}/><SummaryRow label="Recipient Gets" value={preview.recipientGets ? formatMoney(preview.recipientGets, currency) : "—"}/></>}<SummaryRow label="Total" value={formatMoney(preview.total, balanceInfo?.currency || "USD")}/><SummaryRow label="New Balance After Transfer" value={formatMoney(preview.newBalance, balanceInfo?.currency || "USD")} emphasis/></div>
        <div className="transfer-warning">Please verify the transfer details carefully before proceeding. Once confirmed, transfers cannot be reversed.</div>{formError && <div className="transfer-error modal-error" role="alert">{formError}</div>}
        <div className="confirm-modal-actions"><button type="button" className="confirm-transfer-button" disabled={busy} onClick={() => void confirmTransfer()}>{busy ? "Processing…" : "Confirm Transfer"}</button><button type="button" className="cancel-transfer-button" disabled={busy} onClick={() => setPreviewOpen(false)}>Cancel</button></div>
      </>}
    </section></div>}
    {successReference && !previewOpen && <div className="transfer-modal-backdrop"><section className="confirm-transfer-modal" role="dialog" aria-modal="true"><div className="transfer-success"><div className="transfer-success-check">✓</div><h3>Transfer submitted</h3><p>Your reference</p><strong>{successReference}</strong><small>External transfers remain pending until processed.</small><button type="button" onClick={() => router.push("/dashboard")}>Done</button></div></section></div>}
  </main>;
}

function TransferField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="transfer-field"><span>{label}</span><span className="transfer-control">{children}</span></label>;
}

function SummaryRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`summary-row ${emphasis ? "emphasis" : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}
