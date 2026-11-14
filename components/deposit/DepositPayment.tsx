"use client";

import { DragEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

type Wallet = { id: string; name: string; symbol: string; network: string; address: string; icon: string; paymentUriPrefix: string | null };
const proofTypes = ["image/png", "image/jpeg", "application/pdf"];

export default function DepositPayment({ initialAmount, walletId }: { initialAmount: string; walletId: string }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const amount = Number(initialAmount);
  const validAmount = Number.isFinite(amount) && amount > 0;

  useEffect(() => {
    if (!walletId) { setError("Choose a deposit method and amount to continue."); setLoading(false); return; }
    fetch(`/api/crypto/wallets?id=${encodeURIComponent(walletId)}`, { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Wallet details could not be loaded."); const found = body.wallets[0] as Wallet | undefined; if (!found) throw new Error("This deposit method is no longer available."); setWallet(found); }).catch((e) => setError(e instanceof Error ? e.message : "Wallet details could not be loaded.")).finally(() => setLoading(false));
  }, [walletId]);

  useEffect(() => {
    if (!wallet || !validAmount) { setQrUrl(""); return; }
    const prefix = wallet.paymentUriPrefix;
    const isBitcoin = wallet.id.toLowerCase() === "bitcoin" || wallet.symbol.toUpperCase() === "BTC";
    const payload = prefix ? `${prefix}${wallet.address}?amount=${amount.toFixed(2)}` : isBitcoin ? `bitcoin:${wallet.address}?amount=${amount.toFixed(2)}` : wallet.address;
    let cancelled = false;
    QRCode.toDataURL(payload, { width: 220, margin: 2, errorCorrectionLevel: "M", color: { dark: "#10233d", light: "#ffffff" } }).then((url) => { if (!cancelled) setQrUrl(url); }).catch(() => { if (!cancelled) setQrUrl(""); });
    return () => { cancelled = true; };
  }, [wallet, amount, validAmount]);

  async function copyAddress() {
    if (!wallet) return;
    try { await navigator.clipboard.writeText(wallet.address); setCopied(true); window.setTimeout(() => setCopied(false), 2200); }
    catch { setError("Could not copy the wallet address. Please select and copy it manually."); }
  }
  function chooseFile(candidate?: File) {
    if (!candidate) return;
    if (!proofTypes.includes(candidate.type)) { setFile(null); setError("Upload a PNG, JPG, or PDF file."); return; }
    if (candidate.size > 5 * 1024 * 1024) { setFile(null); setError("Payment proof must be no larger than 5 MB."); return; }
    setError(""); setFile(candidate);
  }
  function dropFile(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!wallet) { setError("A current deposit wallet is required."); return; }
    if (!validAmount) { setError("The deposit amount is not valid. Go back and enter a positive amount."); return; }
    if (!file) { setError("Upload your payment proof before submitting."); return; }
    setSubmitting(true);
    try {
      const form = new FormData(); form.set("amount", amount.toFixed(2)); form.set("walletId", wallet.id); form.set("proof", file);
      const response = await fetch("/api/deposits", { method: "POST", body: form }); const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Deposit could not be submitted.");
      setSuccess(body.reference);
    } catch (e) { setError(e instanceof Error ? e.message : "Deposit could not be submitted."); }
    finally { setSubmitting(false); }
  }

  return <main className="deposit-page deposit-payment-page"><div className="deposit-page-top"><div className="deposit-page-title"><Link href="/dashboard" aria-label="Back to Dashboard">←</Link><h1>Make Payment</h1></div><Link className="deposit-header-back" href="/deposit">Change deposit</Link></div><div className="deposit-breadcrumb"><Link href="/dashboard">Dashboard</Link><span>›</span><Link href="/deposit">Deposits</Link><span>›</span><strong>Make Payment</strong></div>
    {loading ? <div className="deposit-panel deposit-loading">Loading payment instructions…</div> : !wallet ? <div className="deposit-alert error" role="alert">{error}<p><Link href="/deposit">Return to Deposit Funds</Link></p></div> : <>
      <section className="deposit-payment-banner"><span className="deposit-method-icon">{wallet.icon}</span><div><small>DEPOSIT METHOD</small><h2>{wallet.name}</h2><p>Requested amount <strong>${validAmount ? amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"} USD</strong></p></div></section>
      <section className="deposit-panel deposit-instructions"><div className="deposit-panel-heading"><span className="deposit-panel-icon">ⓘ</span><div><h2>Payment Instructions</h2><p>Review the details before you send payment.</p></div></div><p>You are to make payment of <strong>${validAmount ? amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</strong> using your selected payment method. Screenshot and upload the proof of payment.</p></section>
      <div className="deposit-payment-grid"><section className="deposit-panel deposit-qr-card"><div className="deposit-panel-heading"><span className="deposit-panel-icon">▦</span><div><h2>Scan QR Code</h2><p>Scan the QR code with your payment app.</p></div></div><div className="deposit-qr-frame">{qrUrl ? <img src={qrUrl} alt={`Payment QR code for ${wallet.name}`} /> : <span>QR code unavailable</span>}</div><p className="deposit-qr-hint">Send only {wallet.symbol} on the {wallet.network} network.</p><div className="deposit-amount-reminder"><span>Amount</span><strong>${validAmount ? amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"} USD</strong></div></section>
        <section className="deposit-panel deposit-wallet-card"><div className="deposit-panel-heading"><span className="deposit-panel-icon">◈</span><div><h2>Wallet Address</h2><p>Send your payment to this exact address.</p></div></div><div className="deposit-address-box"><code>{wallet.address}</code><button type="button" onClick={() => void copyAddress()} aria-label="Copy wallet address">{copied ? "Copied!" : "Copy"}</button></div><p className="deposit-copy-toast" aria-live="polite">{copied ? "Wallet address copied to clipboard." : ""}</p><div className="deposit-network-row"><span>Network Type</span><strong>{wallet.network}</strong></div><div className="deposit-network-row"><span>Payment Asset</span><strong>{wallet.symbol}</strong></div></section></div>
      <section className="deposit-panel deposit-proof-panel"><div className="deposit-panel-heading"><span className="deposit-panel-icon">▧</span><div><h2>Upload Payment Proof</h2><p>Attach a screenshot or document showing your payment.</p></div></div><form onSubmit={submit}><label className={`deposit-drop-zone ${dragging ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={dropFile}><input type="file" accept="image/png,image/jpeg,application/pdf" onChange={(event) => chooseFile(event.target.files?.[0])} hidden/><span className="deposit-upload-icon">↑</span>{file ? <><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · click or drop to replace</small></> : <><strong>Drag and drop your proof here</strong><small>or click to browse · PNG, JPG or PDF (max. 5MB)</small></>}</label>{error && <div className="deposit-alert error" role="alert">{error}</div>}{success && <div className="deposit-alert success" role="status"><strong>Payment proof submitted</strong><p>Your deposit request {success} is pending review. Your account balance will update after the payment is verified.</p><Link href="/transactions">View transaction history →</Link></div>}<button type="submit" className="deposit-continue-button" disabled={submitting || Boolean(success)}><span>➤</span>{submitting ? "Submitting…" : "Submit Payment"}</button></form></section>
    </>}
  </main>;
}
