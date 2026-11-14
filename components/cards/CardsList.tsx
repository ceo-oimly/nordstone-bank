"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Card = { id: string; cardType: string; cardLevel: string; currency: string; last4: string; expiryMonth: number; expiryYear: number; status: string; holderName: string; balance: string; maskedNumber: string };
type Stats = { activeCount: number; pendingCount: number; totalBalance: number };
const faq = [
  ["What is a virtual card?", "It is a simulated card profile inside NORDSTONE BANK for tracking spending. It is not a real bank-issued payment card and cannot be used on external websites."],
  ["How do I start using a card?", "Submit an application and wait for it to show as pending. Once available, activate it from the card details page."],
  ["Can I control card spending?", "Each card has a daily spending limit that is shown in its details. Card controls here are for the NORDSTONE BANK app experience."],
  ["Can I freeze a card?", "Yes. Open an active card and choose Freeze. You can unfreeze it later from the same details page."],
];

export default function CardsList() {
  const [cards, setCards] = useState<Card[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/cards", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Cards could not be loaded."); setCards(body.cards); setStats(body.stats); }).catch((e) => setError(e instanceof Error ? e.message : "Cards could not be loaded.")).finally(() => setLoading(false)); }, []);

  return <main className="cards-page">
    <div className="cards-breadcrumb"><Link href="/dashboard">Dashboard</Link><span>›</span><strong>Cards</strong></div>
    <section className="cards-title-row"><div><span className="cards-eyebrow">YOUR SPENDING TOOLS</span><h1>Virtual Cards</h1><p>Manage simulated cards for activity inside NORDSTONE BANK.</p></div><Link className="cards-button cards-button-primary" href="/cards/apply">＋ Apply for Card</Link></section>
    <section className="cards-stats-grid" aria-label="Card summary"><article><span className="cards-stat-icon blue">▣</span><div><small>Active Cards</small><strong>{stats ? stats.activeCount : "—"}</strong></div></article><article><span className="cards-stat-icon amber">◷</span><div><small>Pending Applications</small><strong>{stats ? stats.pendingCount : "—"}</strong></div></article><article><span className="cards-stat-icon green">▱</span><div><small>Total Card Balance</small><strong>{stats ? `$${stats.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}</strong></div></article></section>
    <section className="cards-promo"><div className="cards-promo-copy"><span className="cards-promo-kicker">NORDSTONE BANK VIRTUAL CARDS</span><h2>Virtual Cards Made Easy</h2><p>Organize spending with simulated cards and simple controls inside your account.</p><div className="cards-feature-grid"><span><i>✓</i>Secure account controls</span><span><i>⌂</i>Use inside NORDSTONE BANK app</span><span><i>◷</i>Spending limits</span><span><i>↗</i>Quick application</span></div><Link href="/cards/apply" className="cards-promo-button">Apply Now <b>→</b></Link></div><div className="cards-promo-art">▣</div></section>
    <section className="cards-section"><div className="cards-section-heading"><div><h2>Your Cards</h2><p>Review status and open a card for its details.</p></div><Link href="/cards/apply" className="cards-button cards-button-outline">＋ New Card</Link></div>
      {error && <div className="cards-error" role="alert">{error}</div>}
      {loading ? <div className="cards-loading">Loading your cards…</div> : cards.length === 0 ? <div className="cards-empty"><span>▣</span><h3>No virtual cards yet</h3><p>Apply for a simulated card to organize activity inside NORDSTONE BANK.</p><Link href="/cards/apply" className="cards-button cards-button-primary">Apply for your first card</Link></div> : <div className="cards-grid">{cards.map((card) => <article className="cards-item" key={card.id}><div className="cards-item-meta"><span className={`cards-status ${card.status}`}>{card.status}</span><span>{card.cardLevel}</span></div><div className="virtual-card-visual"><div className="virtual-card-top"><strong>NORDSTONE BANK</strong><span>Virtual Banking</span></div><span className="virtual-card-number">•••• •••• •••• {card.last4}</span><div className="virtual-card-bottom"><span><small>CARD HOLDER</small><strong>{card.holderName}</strong></span><span><small>VALID THRU</small><strong>{String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}</strong></span></div><span className="virtual-card-brand">{card.cardType}</span></div><div className="cards-item-footer"><span>{card.cardType} <small>· {card.currency} {Number(card.balance).toFixed(2)}</small></span><Link href={`/cards/${card.id}`} className="cards-button cards-button-outline">View Details</Link></div></article>)}</div>}
    </section>
    <section className="cards-section"><div className="cards-section-heading simple"><div><h2>How Virtual Cards Work</h2><p>A simple flow for managing a simulated card in your account.</p></div></div><div className="cards-how-grid"><article><i>✎</i><b>1. Apply</b><p>Choose a card type, level, currency, limit, and billing details.</p></article><article><i>✓</i><b>2. Activate</b><p>When the application is ready, activate it from its details page.</p></article><article><i>↗</i><b>3. Use</b><p>Track activity and manage controls within the NORDSTONE BANK app.</p></article></div></section>
    <section className="cards-faq"><h2>Frequently Asked Questions</h2>{faq.map(([question, answer]) => <details key={question}><summary>{question}<b>＋</b></summary><p>{answer}</p></details>)}</section>
    <p className="cards-disclaimer">Demo virtual card for use inside NORDSTONE BANK only. Not a real bank-issued card.</p>
  </main>;
}
