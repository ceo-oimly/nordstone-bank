"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Card = { id: string; cardType: string; cardLevel: string; currency: string; last4: string; expiryMonth: number; expiryYear: number; status: string; isActive: boolean; holderName: string; billingAddress: string | null; dailyLimit: string; balance: string; createdAt: string; activatedAt: string | null; maskedToken: string; maskedNumber: string };
type Activity = { id: string; type: string; amount: string; currency: string; status: string; description: string | null; reference: string; createdAt: string };
const money = (amount: string, currency: string) => `${currency} ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CardDetails({ cardId }: { cardId: string }) {
  const [card, setCard] = useState<Card | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [revealed, setRevealed] = useState<{ maskedNumber: string; expiryMonth: number; expiryYear: number; maskedToken: string } | null>(null);
  useEffect(() => { void load(); }, [cardId]);
  async function load() {
    setLoading(true); setError("");
    try { const response = await fetch(`/api/cards/${cardId}`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not load this card."); setCard(body.card); setActivity(body.transactions); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load this card."); }
    finally { setLoading(false); }
  }
  async function changeStatus(action: "activate" | "freeze" | "unfreeze") {
    setActionBusy(true); setError("");
    try { const response = await fetch(`/api/cards/${cardId}/${action}`, { method: "POST" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Card action failed."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Card action failed."); }
    finally { setActionBusy(false); }
  }
  async function reveal(event: FormEvent) {
    event.preventDefault(); setError("");
    try { const response = await fetch(`/api/cards/${cardId}/reveal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Details could not be verified."); setRevealed(body.details); setPinOpen(false); setPin(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Details could not be verified."); }
  }
  if (loading) return <main className="card-details-page"><p className="cards-loading">Loading card…</p></main>;
  if (!card) return <main className="card-details-page"><div className="cards-error">{error || "Card not found."}</div><Link href="/cards" className="cards-button cards-button-outline">Back to Cards</Link></main>;
  const action = card.status === "pending" ? <button className="cards-button cards-button-primary" disabled={actionBusy} onClick={() => void changeStatus("activate")}>{actionBusy ? "Updating…" : "Activate Card"}</button> : card.status === "active" ? <button className="cards-button cards-button-outline" disabled={actionBusy} onClick={() => void changeStatus("freeze")}>{actionBusy ? "Updating…" : "Freeze Card"}</button> : card.status === "frozen" ? <button className="cards-button cards-button-primary" disabled={actionBusy} onClick={() => void changeStatus("unfreeze")}>{actionBusy ? "Updating…" : "Unfreeze Card"}</button> : null;
  return <main className="card-details-page"><div className="cards-breadcrumb"><Link href="/dashboard">Dashboard</Link><span>›</span><Link href="/cards">Cards</Link><span>›</span><strong>Card Details</strong></div><div className="cards-section-heading detail-title"><div><span className="cards-eyebrow">VIRTUAL CARD</span><h1>Card Details</h1></div><Link href="/cards" className="cards-button cards-button-outline">← Back to Cards</Link></div>
    {error && <div className="cards-error" role="alert">{error}</div>}
    <div className="card-details-layout"><section className="card-detail-main"><div className="card-detail-visual"><div className="virtual-card-top"><strong>NORDSTONE BANK</strong><span>Virtual Banking</span></div><span className="virtual-card-number">•••• •••• •••• {card.last4}</span><div className="virtual-card-bottom"><span><small>CARD HOLDER</small><strong>{card.holderName}</strong></span><span><small>VALID THRU</small><strong>{String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}</strong></span></div><span className="virtual-card-brand">{card.cardType}</span></div><div className="card-detail-status"><span className={`cards-status ${card.status}`}>{card.status}</span><span>{card.cardLevel}</span></div><div className="card-detail-actions">{action}<button className="cards-button cards-button-outline" onClick={() => { setRevealed(null); setPinOpen(true); }}>Show Details</button></div><p className="cards-disclaimer">Demo virtual card for use inside NORDSTONE BANK only. Not a real bank-issued card.</p></section>
      <section className="card-detail-info"><h2>Card information</h2><div><span>Card type</span><strong>{card.cardType} · {card.cardLevel}</strong></div><div><span>Cardholder</span><strong>{card.holderName}</strong></div><div><span>Currency</span><strong>{card.currency}</strong></div><div><span>Daily spending limit</span><strong>{money(card.dailyLimit, card.currency)}</strong></div><div><span>Card balance</span><strong>{money(card.balance, card.currency)}</strong></div><div><span>Created</span><strong>{new Date(card.createdAt).toLocaleDateString()}</strong></div>{revealed && <div className="revealed-card-details"><span>Verified details</span><strong>{revealed.maskedNumber}</strong><strong>Expires {String(revealed.expiryMonth).padStart(2, "0")}/{revealed.expiryYear}</strong><strong>{revealed.maskedToken}</strong></div>}</section></div>
    <section className="card-detail-activity"><div className="cards-section-heading simple"><div><h2>Recent Card Activity</h2><p>Activity linked to this card in NORDSTONE BANK.</p></div></div>{activity.length ? <div className="card-activity-list">{activity.map((item) => <article key={item.id}><span className={`transaction-type-icon ${item.type.toLowerCase() === "credit" ? "credit" : "debit"}`}>{item.type.toLowerCase() === "credit" ? "↓" : "↑"}</span><div><strong>{item.description || item.type}</strong><small>{new Date(item.createdAt).toLocaleString()} · {item.reference}</small></div><b>{item.type.toLowerCase() === "credit" ? "+" : "−"}{money(item.amount, item.currency)}</b><span className={`cards-status ${item.status}`}>{item.status}</span></article>)}</div> : <div className="cards-empty compact"><span>↗</span><h3>No card activity yet</h3><p>Transactions linked to this card will appear here.</p></div>}</section>
    {pinOpen && <div className="cards-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setPinOpen(false); }}><form className="cards-pin-modal" onSubmit={reveal}><button type="button" aria-label="Close" onClick={() => setPinOpen(false)}>×</button><span className="cards-stat-icon blue">♙</span><h2>Verify your identity</h2><p>Enter your 4-digit account PIN to view the masked card details.</p><label>Account PIN<input autoFocus type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required/></label>{error && <div className="cards-error">{error}</div>}<button className="cards-button cards-button-primary" type="submit">Verify PIN</button></form></div>}
  </main>;
}
