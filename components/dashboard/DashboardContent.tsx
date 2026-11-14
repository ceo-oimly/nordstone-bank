"use client";

import { useEffect, useState } from "react";

type DashboardData = {
  user: { firstName: string; lastName: string; initials: string };
  account: null | { accountNumberMasked: string; balance: string; currency: string; status: string; transactionLimit: string; createdAt: Date | string };
  cards: Array<{ id: string; cardType: string; last4: string; expiryMonth: number; expiryYear: number; status: string; holderName: string; createdAt: Date | string }>;
  recentTransactions: Array<{ id: string; type: string; amount: string; currency: string; status: string; description: string | null; counterpartyName: string | null; reference: string; createdAt: Date | string }>;
  stats: { pendingTotal: string; volumeTotal: string; accountAge: string };
};

function money(value: string | number, currency = "USD") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `— ${currency}`;
  try { return `${new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)} ${currency}`; }
  catch { return `${amount.toFixed(2)} ${currency}`; }
}

function formatDate(value: Date | string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function AccountBalanceCard({ data }: { data: DashboardData }) {
  const [now, setNow] = useState<Date | null>(null);
  const [visible, setVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setNow(new Date()); const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  const hour = now?.getHours() ?? 12;
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const account = data.account;
  const masked = account?.accountNumberMasked || "—";
  async function copyAccount() {
    try { await navigator.clipboard.writeText(masked); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); }
  }
  const dateText = now ? now.toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "";
  return <section className="dashboard-balance-card">
    <div className="balance-welcome"><div className="balance-avatar">{data.user.initials || "?"}</div><div className="welcome-copy"><strong>{greeting}, {data.user.firstName}</strong><small>{dateText}</small></div><div className="live-clock">{now ? now.toLocaleTimeString("en-US", { hour12: true }) : "--:--:--"}</div></div>
    <div className="balance-label-row"><span>Available Balance</span><button type="button" className="balance-eye" aria-label={visible ? "Hide balance" : "Show balance"} onClick={() => setVisible(!visible)}>{visible ? "◉" : "◎"}</button></div>
    <div className="balance-amount">{account ? visible ? money(account.balance, account.currency) : "••••••••" : "—"}</div>
    <div className="account-details-card"><div className="account-detail-head"><span className="account-shield">♢</span><div className="account-number-copy"><span>Your Account Number</span><strong>{masked}</strong></div><button type="button" className="copy-account" onClick={copyAccount} aria-label="Copy masked account number">{copied ? "✓" : "▣"}</button><span className={`account-status status-${account?.status.toLowerCase() || "unknown"}`}>{account?.status || "Unavailable"}</span></div><div className="balance-actions"><a href="/transactions">Transactions</a><a href="/deposit">Top up</a></div></div>
  </section>;
}

export default function DashboardContent({ data }: { data: DashboardData }) {
  const card = data.cards[0];
  return <main className="dashboard-content">
    <AccountBalanceCard data={data}/>

    <section className="dashboard-section quick-actions-section"><div className="dash-section-heading"><h2>What would you like to do today?</h2><p>Choose from our popular actions below</p></div><div className="quick-actions-grid">
      <a className="quick-action action-account" href="/account"><i>▤</i><span>Account Info</span><b>›</b></a>
      <a className="quick-action action-send" href="/transfer"><i>➤</i><span>Send Money</span><b>›</b></a>
      <a className="quick-action action-deposit" href="/deposit"><i>＋</i><span>Deposit</span><b>›</b></a>
      <a className="quick-action action-history" href="/transactions"><i>◷</i><span>History</span><b>›</b></a>
    </div></section>

    <section className="dashboard-section"><div className="dash-section-heading dash-section-row"><h2>Your Cards</h2><a href="/cards">View all <b>›</b></a></div>
      {card ? <div className="dashboard-card-wrap"><article className="virtual-card"><div className="virtual-card-top"><span className="virtual-card-brand">NORDSTONE BANK<small>Virtual Banking</small></span><strong>VISA</strong></div><span className="card-chip">▦</span><div className="card-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;{card.last4}</div><div className="card-bottom"><div><small>CARD HOLDER</small><strong>{card.holderName}</strong></div><div><small>VALID THRU</small><strong>{String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}</strong></div><span className={`card-status status-${card.status.toLowerCase()}`}>{card.status}</span></div></article><div className="card-detail-row"><span>{card.cardType}</span><a href={`/cards/${card.id}`}>View Details</a></div></div> : <div className="empty-dashboard-card"><div className="empty-card-icon">▣</div><div><strong>No cards yet</strong><p>Request a card to see it here.</p></div><a href="/cards">Request Card <b>›</b></a></div>}
    </section>

    <section className="dashboard-section"><div className="dash-section-heading dash-section-row"><h2>Recent Transactions</h2><a href="/transactions">View all <b>›</b></a></div><div className="transaction-table"><div className="transaction-table-head"><span>TRANSACTION</span><span>AMOUNT</span><span>TYPE</span></div>
      {data.recentTransactions.length === 0 ? <p className="transactions-empty">No transactions yet. Your transactions will appear here.</p> : data.recentTransactions.map((transaction) => { const credit = transaction.type.toLowerCase() === "credit"; const title = transaction.counterpartyName || transaction.description || (credit ? "Money received" : "Payment sent"); return <article className="transaction-row" key={transaction.id}><span className={`transaction-type-icon ${credit ? "credit" : "debit"}`}>{credit ? "+" : "−"}</span><span className="transaction-description"><strong>{title}</strong><small>{formatDate(transaction.createdAt)}</small></span><strong className={`transaction-amount ${credit ? "credit-text" : "debit-text"}`}>{credit ? "+" : "−"}{money(transaction.amount, transaction.currency)}</strong><span className={`transaction-type-pill ${credit ? "credit-pill" : "debit-pill"}`}>{credit ? "Credit" : "Debit"}</span></article>; })}</div>
    </section>

    <section className="dashboard-section"><div className="dash-section-heading"><h2>Account Statistics</h2></div><div className="account-stats-list">
      <StatRow icon="▣" color="blue" label="Transaction Limit" value={data.account ? money(data.account.transactionLimit, data.account.currency) : "—"}/>
      <StatRow icon="◷" color="yellow" label="Pending Transactions" value={money(data.stats.pendingTotal, data.account?.currency || "USD")}/>
      <StatRow icon="▥" color="green" label="Transaction Volume" value={money(data.stats.volumeTotal, data.account?.currency || "USD")}/>
      <StatRow icon="▦" color="purple" label="Account Age" value={data.stats.accountAge}/>
    </div></section>

    <section className="dashboard-section"><div className="dash-section-heading"><h2>Quick Transfer</h2></div><div className="quick-transfer-grid"><a href="/transfer?type=local"><span>⇄</span><div><strong>Local Transfer</strong><small>0% Handling charges</small></div><b>›</b></a><a href="/transfer?type=international"><span>◎</span><div><strong>International Transfer</strong><small>Global reach, 0% fee</small></div><b>›</b></a></div></section>

    <section className="dashboard-help-card"><span className="help-question">?</span><h2>Need Help?</h2><p>Our support team is here to assist you 24/7</p><a href="/support">Contact Support <b>›</b></a></section>
  </main>;
}

function StatRow({ icon, color, label, value }: { icon: string; color: "blue" | "yellow" | "green" | "purple"; label: string; value: string }) {
  return <div className="stat-row"><span className={`stat-icon ${color}`}>{icon}</span><span>{label}</span><strong>{value}</strong></div>;
}
