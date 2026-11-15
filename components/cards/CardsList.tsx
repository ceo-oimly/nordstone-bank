"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/formatting";

type Card = { id: string; cardType: string; cardLevel: string; currency: string; last4: string; expiryMonth: number; expiryYear: number; status: string; holderName: string; balance: string; maskedNumber: string };
type Stats = { activeCount: number; pendingCount: number; totalBalance: number };
const faq = [
  ["What is a virtual card?", "It is a simulated card profile inside NORDSTONE BANK for tracking spending. It is not a real bank-issued payment card and cannot be used on external websites."],
  ["How do I start using a card?", "Submit an application and wait for it to show as pending. Once available, activate it from the card details page."],
  ["Can I control card spending?", "Each card has a daily spending limit that is shown in its details. Card controls here are for the NORDSTONE BANK app experience."],
  ["Can I freeze a card?", "Yes. Open an active card and choose Freeze. You can unfreeze it later from the same details page."],
];

export default function CardsList() {
  const { t, locale } = useLanguage();
  const [cards, setCards] = useState<Card[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/cards", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Cards could not be loaded."); setCards(body.cards); setStats(body.stats); }).catch((e) => setError(e instanceof Error ? e.message : "Cards could not be loaded.")).finally(() => setLoading(false)); }, []);

  return <main className="cards-page">
    <div className="cards-breadcrumb"><Link href="/dashboard">{t("Dashboard")}</Link><span>›</span><strong>{t("Cards")}</strong></div>
    <section className="cards-title-row"><div><span className="cards-eyebrow">{t("YOUR SPENDING TOOLS")}</span><h1>{t("Virtual Cards")}</h1><p>{t("Manage simulated cards for activity inside NORDSTONE BANK.")}</p></div><Link className="cards-button cards-button-primary" href="/cards/apply">＋ {t("Apply for Card")}</Link></section>
    <section className="cards-stats-grid" aria-label={t("Card summary")}><article><span className="cards-stat-icon blue">▣</span><div><small>{t("Active Cards")}</small><strong>{stats ? stats.activeCount : "—"}</strong></div></article><article><span className="cards-stat-icon amber">◷</span><div><small>{t("Pending Applications")}</small><strong>{stats ? stats.pendingCount : "—"}</strong></div></article><article><span className="cards-stat-icon green">▱</span><div><small>{t("Total Card Balance")}</small><strong>{stats ? formatCurrency(stats.totalBalance, "USD", locale) : "—"}</strong></div></article></section>
    <section className="cards-promo"><div className="cards-promo-copy"><span className="cards-promo-kicker">{t("NORDSTONE BANK VIRTUAL CARDS")}</span><h2>{t("Virtual Cards Made Easy")}</h2><p>{t("Organize spending with simulated cards and simple controls inside your account.")}</p><div className="cards-feature-grid"><span><i>✓</i>{t("Secure account controls")}</span><span><i>⌂</i>{t("Use inside NORDSTONE BANK app")}</span><span><i>◷</i>{t("Spending limits")}</span><span><i>↗</i>{t("Quick application")}</span></div><Link href="/cards/apply" className="cards-promo-button">{t("Apply Now")} <b>→</b></Link></div><div className="cards-promo-art">▣</div></section>
    <section className="cards-section"><div className="cards-section-heading"><div><h2>{t("Your Cards")}</h2><p>{t("Review status and open a card for its details.")}</p></div><Link href="/cards/apply" className="cards-button cards-button-outline">＋ {t("New Card")}</Link></div>
      {error && <div className="cards-error" role="alert">{error}</div>}
      {loading ? <div className="cards-loading">{t("Loading your cards…")}</div> : cards.length === 0 ? <div className="cards-empty"><span>▣</span><h3>{t("No virtual cards yet")}</h3><p>{t("Apply for a simulated card to organize activity inside NORDSTONE BANK.")}</p><Link href="/cards/apply" className="cards-button cards-button-primary">{t("Apply for your first card")}</Link></div> : <div className="cards-grid">{cards.map((card) => <article className="cards-item" key={card.id}><div className="cards-item-meta"><span className={`cards-status ${card.status}`}>{t(card.status)}</span><span>{t(card.cardLevel)}</span></div><div className="virtual-card-visual"><div className="virtual-card-top"><strong>NORDSTONE BANK</strong><span>{t("Virtual Banking")}</span></div><span className="virtual-card-number">•••• •••• •••• {card.last4}</span><div className="virtual-card-bottom"><span><small>{t("CARD HOLDER")}</small><strong>{card.holderName}</strong></span><span><small>{t("VALID THRU")}</small><strong>{String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}</strong></span></div><span className="virtual-card-brand">{t(card.cardType)}</span></div><div className="cards-item-footer"><span>{t(card.cardType)} <small>· {card.currency} {new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(card.balance))}</small></span><Link href={`/cards/${card.id}`} className="cards-button cards-button-outline">{t("View Details")}</Link></div></article>)}</div>}
    </section>
    <section className="cards-section"><div className="cards-section-heading simple"><div><h2>{t("How Virtual Cards Work")}</h2><p>{t("A simple flow for managing a simulated card in your account.")}</p></div></div><div className="cards-how-grid"><article><i>✎</i><b>1. {t("Apply")}</b><p>{t("Choose a card type, level, currency, limit, and billing details.")}</p></article><article><i>✓</i><b>2. {t("Activate")}</b><p>{t("When the application is ready, activate it from its details page.")}</p></article><article><i>↗</i><b>3. {t("Use")}</b><p>{t("Track activity and manage controls within the NORDSTONE BANK app.")}</p></article></div></section>
    <section className="cards-faq"><h2>{t("Frequently Asked Questions")}</h2>{faq.map(([question, answer]) => <details key={question}><summary>{t(question)}<b>＋</b></summary><p>{t(answer)}</p></details>)}</section>
    <p className="cards-disclaimer">{t("Demo virtual card for use inside NORDSTONE BANK only. Not a real bank-issued card.")}</p>
  </main>;
}
