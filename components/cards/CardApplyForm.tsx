"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Currency = { code: string; name: string };
const choices = [
  { name: "Visa", description: "A familiar option for organizing purchases." },
  { name: "Mastercard", description: "A flexible card profile for your account." },
  { name: "American Express", description: "Another simulated card style to choose." },
];

export default function CardApplyForm({ currencies, holderName, fee }: { currencies: Currency[]; holderName: string; fee: string }) {
  const router = useRouter();
  const [cardType, setCardType] = useState("Visa");
  const [cardLevel, setCardLevel] = useState("");
  const [currency, setCurrency] = useState(currencies.some((item) => item.code === "USD") ? "USD" : currencies[0]?.code || "");
  const [dailyLimit, setDailyLimit] = useState("1000");
  const [name, setName] = useState(holderName);
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setFormError("");
    const next: Record<string, string> = {};
    if (!cardType) next.cardType = "Choose a card type.";
    if (!cardLevel) next.cardLevel = "Select a card level.";
    if (!currency) next.currency = "Select a currency.";
    const amount = Number(dailyLimit);
    if (!Number.isFinite(amount) || amount < 1000 || amount > 10000) next.dailyLimit = "Enter an amount from $1,000 to $10,000.";
    if (!name.trim()) next.holderName = "Enter the name to display on the card.";
    if (!address.trim()) next.billingAddress = "Enter your billing address.";
    setErrors(next); if (Object.keys(next).length) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/cards/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cardType, cardLevel, currency, dailyLimit: amount, holderName: name, billingAddress: address }) });
      const body = await response.json();
      if (!response.ok) { if (body.fields) setErrors(body.fields); throw new Error(body.error || "Application could not be submitted."); }
      setSuccess(true); setTimeout(() => router.push("/cards"), 1800);
    } catch (e) { setFormError(e instanceof Error ? e.message : "Application could not be submitted."); }
    finally { setSubmitting(false); }
  }

  return <main className="card-apply-page"><div className="cards-breadcrumb"><Link href="/dashboard">Dashboard</Link><span>›</span><Link href="/cards">Cards</Link><span>›</span><strong>Apply</strong></div><div className="cards-section-heading apply-title"><div><span className="cards-eyebrow">NEW CARD REQUEST</span><h1>Apply for Virtual Card</h1></div><Link href="/cards" className="cards-button cards-button-outline">← Back to Cards</Link></div><section className="card-apply-hero"><span>NORDSTONE BANK VIRTUAL CARDS</span><h2>Apply for a Virtual Card</h2><p>Set up a simulated card profile for tracking activity inside NORDSTONE BANK.</p><b>•••• &nbsp;•••• &nbsp;•••• &nbsp;••••</b></section>
    {success ? <section className="card-apply-success"><span>✓</span><h2>Application submitted</h2><p>Your card request is pending. You can check its status on the Cards page.</p><Link href="/cards">Return to Cards</Link></section> : <form className="card-apply-form" onSubmit={submit} noValidate>
      <section className="card-form-section"><div className="card-form-heading"><span>01</span><div><h2>Card Details</h2><p>Choose the preferences for your virtual card.</p></div></div><div className="card-type-choices">{choices.map((choice) => <label key={choice.name} className={`card-type-choice ${cardType === choice.name ? "selected" : ""}`}><input type="radio" name="cardType" value={choice.name} checked={cardType === choice.name} onChange={() => setCardType(choice.name)}/><span className="card-type-check">{cardType === choice.name ? "✓" : ""}</span><strong>{choice.name}</strong><small>{choice.description}</small></label>)}</div>{errors.cardType && <small className="card-field-error">{errors.cardType}</small>}
        <div className="card-form-grid"><label className="card-field">Card Level *<select value={cardLevel} onChange={(e) => setCardLevel(e.target.value)}><option value="">Select a card level</option><option>Standard</option><option>Gold</option><option>Platinum</option></select><small>Choose the level for the card profile.</small>{errors.cardLevel && <em>{errors.cardLevel}</em>}</label><label className="card-field">Currency *<select value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="">Select currency</option>{currencies.map((item) => <option key={item.code} value={item.code}>{item.code} — {item.name}</option>)}</select><small>Choose from currencies available in your account.</small>{errors.currency && <em>{errors.currency}</em>}</label><label className="card-field full">Daily Spending Limit *<span className="card-limit-control"><b>$</b><input type="number" min="1000" max="10000" step="100" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)}/><small>{currency || "USD"}</small></span><small>Limits: $1,000.00 – $10,000.00</small>{errors.dailyLimit && <em>{errors.dailyLimit}</em>}</label></div>
      </section>
      <section className="card-form-section"><div className="card-form-heading"><span>02</span><div><h2>Billing Information</h2><p>Provide the cardholder and billing details.</p></div></div><div className="card-form-grid"><label className="card-field full">Cardholder Name *<input value={name} onChange={(e) => setName(e.target.value)} maxLength={240} placeholder="Name as it should appear"/><small>Name as it will appear on your card.</small>{errors.holderName && <em>{errors.holderName}</em>}</label><label className="card-field full">Billing Address *<textarea value={address} onChange={(e) => setAddress(e.target.value)} maxLength={2000} rows={4} placeholder="Street, city, region, postal code, country"/><small>Address used for verification when making purchases.</small>{errors.billingAddress && <em>{errors.billingAddress}</em>}</label></div></section>
      <aside className="card-fee-info"><span>ⓘ</span><div><strong>Card Issuance Fee</strong><p>One-time issuance fee: <b>${Number(fee || 0).toFixed(2)}</b>. The fee shown is read from your account settings.</p></div></aside>
      {formError && <div className="cards-error" role="alert">{formError}</div>}<button type="submit" className="cards-button cards-button-primary card-submit-button" disabled={submitting}>{submitting ? "Submitting…" : "Submit Application"}<b>→</b></button><p className="cards-disclaimer">Demo virtual card for use inside NORDSTONE BANK only. Not a real bank-issued card.</p>
    </form>}
  </main>;
}
