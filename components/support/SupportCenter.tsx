"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Ticket = { id: string; ticketNumber: string; title: string; priority: string; status: string; createdAt: string | Date };
const dateText = (date: string | Date) => new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default function SupportCenter() {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Low");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState("");

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true); setTicketsError("");
    try { const response = await fetch("/api/support/tickets", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Tickets could not be loaded."); setTickets(body.tickets); }
    catch (error) { setTicketsError(error instanceof Error ? error.message : "Tickets could not be loaded."); }
    finally { setTicketsLoading(false); }
  }, []);
  useEffect(() => { void loadTickets(); }, [loadTickets]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setFormError(""); setSuccess("");
    const cleanTitle = title.trim(); const cleanDescription = description.trim();
    if (cleanTitle.length < 5 || cleanTitle.length > 100) { setFormError("Ticket title must be between 5 and 100 characters."); return; }
    if (cleanDescription.length < 20 || cleanDescription.length > 2000) { setFormError("Please describe your issue in at least 20 characters."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: cleanTitle, priority, description: cleanDescription }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Ticket could not be submitted.");
      setTitle(""); setPriority("Low"); setDescription(""); setSuccess(`Ticket ${body.ticketNumber} created. Our team will respond within 24 hours.`);
      await loadTickets();
    } catch (error) { setFormError(error instanceof Error ? error.message : "Ticket could not be submitted."); }
    finally { setSubmitting(false); }
  }

  return <main className="support-page"><div className="support-breadcrumb"><Link href="/dashboard">Dashboard</Link><span>›</span><strong>Support</strong></div><section className="support-heading"><span>WE’RE HERE TO HELP</span><h1>Support Center</h1><p>Get assistance with your account and banking services.</p></section>
    <section className="support-submit-card"><div className="support-card-heading"><span>♧</span><div><h2>Submit a Support Ticket</h2><p>We're here to help. Tell us about your issue and we'll find a solution.</p></div></div><div className="support-illustration" aria-hidden="true"><div className="support-chat-bubble"><span>?</span><i/></div></div>
      <form className="support-ticket-form" onSubmit={submit} noValidate><label className="support-field">Ticket Title<div className="support-title-input"><span>▱</span><input required maxLength={100} minLength={5} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Briefly describe your issue"/><small>{title.length}/100</small></div><small className="support-helper">Be specific to help us understand your issue.</small></label>
        <label className="support-field">Priority Level<div className="support-select-wrap"><span>⚑</span><select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="Low">Low Priority</option><option value="Medium">Medium Priority</option><option value="High">High Priority</option></select></div><small className="support-helper">Select based on urgency of your request.</small></label>
        <label className="support-field">Describe Your Issue<div className="support-description-wrap"><span>☷</span><textarea required minLength={20} maxLength={2000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Please provide all relevant details about your issue so we can help you better"/></div><small className="support-helper">Include any relevant details that might help us resolve your issue. {description.length}/2000</small></label>
        <aside className="support-info-box"><span>ⓘ</span><div><strong>Support Information</strong><p>Our support team typically responds within 24 hours. For urgent matters, please select “High Priority” and we'll do our best to assist you sooner.</p></div></aside>
        {formError && <div className="support-alert error" role="alert">{formError}</div>}{success && <div className="support-alert success" role="status">✓ {success}</div>}
        <button type="submit" className="support-submit-button" disabled={submitting}><span>➤</span>{submitting ? "Submitting..." : "Submit Ticket"}</button>
      </form>
    </section>
    <section className="support-my-tickets"><div className="support-section-heading"><div><h2>My Tickets</h2><p>Review your support requests and replies.</p></div><button type="button" onClick={() => void loadTickets()} disabled={ticketsLoading} aria-label="Refresh tickets">↻</button></div>
      {ticketsError && <div className="support-alert error" role="alert">{ticketsError}</div>}
      {ticketsLoading ? <div className="support-tickets-loading">Loading your tickets…</div> : tickets.length === 0 ? <div className="support-empty"><span>♧</span><p>No tickets yet. Submit your first ticket above.</p></div> : <div className="support-ticket-list">{tickets.map((ticket) => <Link href={`/support/${ticket.id}`} className="support-ticket-row" key={ticket.id}><div className="support-ticket-copy"><strong>{ticket.ticketNumber}</strong><span>{ticket.title}</span><small>Created {dateText(ticket.createdAt)}</small></div><div className="support-ticket-badges"><span className={`support-priority ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span><span className={`support-status ${ticket.status.toLowerCase().replaceAll(" ", "-")}`}>{ticket.status}</span></div><b className="support-ticket-arrow">›</b></Link>)}</div>}
    </section>
  </main>;
}
