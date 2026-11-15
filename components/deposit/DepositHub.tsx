"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type Wallet = { id: string; name: string; symbol: string; network: string; address: string; icon: string; paymentUriPrefix: string | null };
const quickAmounts = [100, 500, 1000, 5000, 10000];

export default function DepositHub() {
  const router = useRouter();
  const { t } = useLanguage();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    fetch("/api/crypto/wallets", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Deposit methods could not be loaded."); setWallets(body.wallets); setSelected(body.wallets[0]?.id || ""); }).catch((e) => setError(e instanceof Error ? e.message : "Deposit methods could not be loaded.")).finally(() => setLoading(false));
  }, []);
  const amountNumber = Number(amount);
  const canContinue = Boolean(selected) && Number.isFinite(amountNumber) && amountNumber > 0;

  return <main className={`deposit-page ${dark ? "deposit-dark" : ""}`}>
    <div className="deposit-page-top"><div className="deposit-page-title"><Link href="/dashboard" aria-label={t("Back to Dashboard")}>←</Link><h1>{t("Deposit Funds")}</h1></div><button type="button" className="deposit-theme-toggle" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setDark((value) => !value)}>{dark ? "☀" : "☾"}</button></div>
    <div className="deposit-breadcrumb"><Link href="/dashboard">{t("Dashboard")}</Link><span>›</span><strong>{t("Deposit")}</strong></div>
    <section className="deposit-intro-card"><span className="deposit-intro-icon">▱</span><h2>{t("Fund Your Account")}</h2><p>{t("Choose your preferred deposit method and amount")}</p></section>
    <section className="deposit-panel"><div className="deposit-panel-heading"><span className="deposit-step-number">01</span><div><h2>{t("Select Deposit Method")}</h2><p>Choose an available payment method.</p></div></div>
      {error && <div className="deposit-alert error" role="alert">{error}</div>}
      {loading ? <div className="deposit-method-empty">Loading deposit methods…</div> : wallets.length === 0 ? <div className="deposit-method-empty"><span>◈</span><strong>No deposit methods are available</strong><p>Please contact support if you need help funding your account.</p></div> : <div className="deposit-method-grid">{wallets.map((wallet) => <button type="button" key={wallet.id} className={`deposit-method-option ${selected === wallet.id ? "selected" : ""}`} onClick={() => setSelected(wallet.id)} aria-pressed={selected === wallet.id}><span className="deposit-method-icon">{wallet.icon}</span><span className="deposit-method-copy"><strong>{wallet.name}</strong><small>{wallet.network} · {wallet.symbol}</small></span><span className="deposit-radio">{selected === wallet.id ? "✓" : ""}</span></button>)}</div>}
    </section>
    <section className="deposit-panel"><div className="deposit-panel-heading"><span className="deposit-step-number">02</span><div><h2>{t("Deposit Amount")}</h2><p>Enter the amount you would like to add.</p></div></div><label className="deposit-amount-field"><span>$</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" aria-label="Deposit amount in US dollars"/><small>USD</small></label><div className="deposit-quick-amounts"><span>{t("Quick amount")}</span>{quickAmounts.map((value) => <button type="button" key={value} className={amount === String(value) ? "selected" : ""} onClick={() => setAmount(String(value))}>${value.toLocaleString("en-US")}</button>)}</div>
    </section>
    <div className="deposit-action-stack"><button type="button" className="deposit-continue-button" disabled={!canContinue || loading} onClick={() => router.push(`/deposit/payment?amount=${encodeURIComponent(amountNumber.toFixed(2))}&method=${encodeURIComponent(selected)}`)}>{t("Continue to Deposit")} <b>→</b></button><Link href="/dashboard" className="deposit-back-button">{t("Back to Dashboard")}</Link></div>
  </main>;
}
