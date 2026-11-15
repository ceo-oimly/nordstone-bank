"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatCurrency, formatDate } from "@/lib/formatting";

type DashboardData = {
  user: { firstName: string; lastName: string; initials: string };
  account: null | { accountNumberMasked: string; balance: string; currency: string; status: string; transactionLimit: string; createdAt: Date | string };
  cards: Array<{ id: string; cardType: string; last4: string; expiryMonth: number; expiryYear: number; status: string; holderName: string; createdAt: Date | string }>;
  recentTransactions: Array<{ id: string; type: string; amount: string; currency: string; status: string; description: string | null; counterpartyName: string | null; reference: string; createdAt: Date | string }>;
  stats: { pendingTotal: string; volumeTotal: string; accountAge: string };
};

const money = (value: string | number, currency = "USD", locale = "en-US") => formatCurrency(value, currency, locale);

function AccountBalanceCard({ data }: { data: DashboardData }) {
  const { t, locale } = useLanguage();
  const [now, setNow] = useState<Date | null>(null);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setNow(new Date()); const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  const hour = now?.getHours() ?? 12;
  const greeting = t(hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening");
  const account = data.account;
  const masked = account?.accountNumberMasked || "—";
  async function copyAccount() {
    try { await navigator.clipboard.writeText(masked); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); }
  }
  const dateText = now ? now.toLocaleDateString(locale, { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "";
  return <section className="dashboard-balance-card">
    <div className="balance-welcome"><div className="balance-avatar">{data.user.initials || "?"}</div><div className="welcome-copy"><strong>{greeting}, {data.user.firstName}</strong><small>{dateText}</small></div><div className="live-clock">{now ? now.toLocaleTimeString(locale, { hour12: true }) : "--:--:--"}</div></div>
    <div className="balance-label-row"><span>{t("Available Balance")}</span><button type="button" className="balance-eye" aria-label={t(visible ? "Hide balance" : "Show balance")} onClick={() => setVisible(!visible)}>{visible ? "◉" : "◎"}</button></div>
    <div className="balance-amount">{account ? visible ? money(account.balance, account.currency, locale) : "••••••••" : "—"}</div>
    <div className="account-details-card"><div className="account-detail-head"><span className="account-shield">♢</span><div className="account-number-copy"><span>{t("Your Account Number")}</span><strong>{masked}</strong></div><button type="button" className="copy-account" onClick={copyAccount} aria-label={t("Copy masked account number")}>{copied ? "✓" : "▣"}</button><span className={`account-status status-${account?.status.toLowerCase() || "unknown"}`}>{t(account?.status || "Unavailable")}</span></div><div className="balance-actions"><a href="/transactions">{t("Transactions")}</a><a href="/deposit">{t("Top up")}</a></div></div>
  </section>;
}

export default function DashboardContent({ data }: { data: DashboardData }) {
  const { t, locale } = useLanguage();
  const card = data.cards[0];
  return <main className="dashboard-content">
    <AccountBalanceCard data={data}/>

    <section className="dashboard-section quick-actions-section"><div className="dash-section-heading"><h2>{t("What would you like to do today?")}</h2><p>{t("Choose from our popular actions below")}</p></div><div className="quick-actions-grid">
      <a className="quick-action action-account" href="/account"><i>▤</i><span>{t("Account Info")}</span><b>›</b></a>
      <a className="quick-action action-send" href="/transfer"><i>➤</i><span>{t("Send Money")}</span><b>›</b></a>
      <a className="quick-action action-deposit" href="/deposit"><i>＋</i><span>{t("Deposit")}</span><b>›</b></a>
      <a className="quick-action action-history" href="/transactions"><i>◷</i><span>{t("History")}</span><b>›</b></a>
    </div></section>

    <section className="dashboard-section"><div className="dash-section-heading dash-section-row"><h2>{t("Your Cards")}</h2><a href="/cards">{t("View all")} <b>›</b></a></div>
      {card ? <div className="dashboard-card-wrap"><article className="virtual-card"><div className="virtual-card-top"><span className="virtual-card-brand">NORDSTONE BANK<small>{t("Virtual Banking")}</small></span><strong>VISA</strong></div><span className="card-chip">▦</span><div className="card-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;{card.last4}</div><div className="card-bottom"><div><small>{t("CARD HOLDER")}</small><strong>{card.holderName}</strong></div><div><small>{t("VALID THRU")}</small><strong>{String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}</strong></div><span className={`card-status status-${card.status.toLowerCase()}`}>{t(card.status)}</span></div></article><div className="card-detail-row"><span>{t(card.cardType)}</span><a href={`/cards/${card.id}`}>{t("View Details")}</a></div></div> : <div className="empty-dashboard-card"><div className="empty-card-icon">▣</div><div><strong>{t("No cards yet")}</strong><p>{t("Request a card to see it here.")}</p></div><a href="/cards">{t("Request Card")} <b>›</b></a></div>}
    </section>

    <section className="dashboard-section"><div className="dash-section-heading dash-section-row"><h2>{t("Recent Transactions")}</h2><a href="/transactions">{t("View all")} <b>›</b></a></div><div className="transaction-table"><div className="transaction-table-head"><span>{t("TRANSACTION")}</span><span>{t("AMOUNT")}</span><span>{t("TYPE")}</span></div>
      {data.recentTransactions.length === 0 ? <p className="transactions-empty">{t("No transactions yet. Your transactions will appear here.")}</p> : data.recentTransactions.map((transaction) => { const credit = transaction.type.toLowerCase() === "credit"; const title = transaction.counterpartyName || transaction.description || t(credit ? "Money received" : "Payment sent"); return <article className="transaction-row" key={transaction.id}><span className={`transaction-type-icon ${credit ? "credit" : "debit"}`}>{credit ? "+" : "−"}</span><span className="transaction-description"><strong>{t(title)}</strong><small>{formatDate(transaction.createdAt, locale)}</small></span><strong className={`transaction-amount ${credit ? "credit-text" : "debit-text"}`}>{credit ? "+" : "−"}{money(transaction.amount, transaction.currency, locale)}</strong><span className={`transaction-type-pill ${credit ? "credit-pill" : "debit-pill"}`}>{t(credit ? "Credit" : "Debit")}</span></article>; })}</div>
    </section>

    <section className="dashboard-section"><div className="dash-section-heading"><h2>{t("Account Statistics")}</h2></div><div className="account-stats-list">
      <StatRow icon="▣" color="blue" label={t("Transaction Limit")} value={data.account ? money(data.account.transactionLimit, data.account.currency, locale) : "—"}/>
      <StatRow icon="◷" color="yellow" label={t("Pending Transactions")} value={money(data.stats.pendingTotal, data.account?.currency || "USD", locale)}/>
      <StatRow icon="▥" color="green" label={t("Transaction Volume")} value={money(data.stats.volumeTotal, data.account?.currency || "USD", locale)}/>
      <StatRow icon="▦" color="purple" label={t("Account Age")} value={t(data.stats.accountAge)}/>
    </div></section>

    <section className="dashboard-section"><div className="dash-section-heading"><h2>{t("Quick Transfer")}</h2></div><div className="quick-transfer-grid"><a href="/transfer?type=local"><span>⇄</span><div><strong>{t("Local Transfer")}</strong><small>{t("0% Handling charges")}</small></div><b>›</b></a><a href="/transfer?type=international"><span>◎</span><div><strong>{t("International Transfer")}</strong><small>{t("Global reach, 0% fee")}</small></div><b>›</b></a></div></section>

    <section className="dashboard-help-card"><span className="help-question">?</span><h2>{t("Need Help?")}</h2><p>{t("Our support team is here to assist you 24/7")}</p><a href="/support">{t("Contact Support")} <b>›</b></a></section>
  </main>;
}

function StatRow({ icon, color, label, value }: { icon: string; color: "blue" | "yellow" | "green" | "purple"; label: string; value: string }) {
  return <div className="stat-row"><span className={`stat-icon ${color}`}>{icon}</span><span>{label}</span><strong>{value}</strong></div>;
}
