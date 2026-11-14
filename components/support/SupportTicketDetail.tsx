"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Ticket = { id: string; ticketNumber: string; title: string; description: string; priority: string; status: string; createdAt: string | Date; updatedAt: string | Date };
type Message = { id: string; senderType: string; senderId: string; message: string; createdAt: string | Date };
const dateTime = (date: string | Date) => new Date(date).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function SupportTicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const loadTicket = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch(`/api/support/tickets/${ticketId}`, { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Ticket could not be loaded."); setTicket(body.ticket); setMessages(body.messages); }
    catch (e) { setError(e instanceof Error ? e.message : "Ticket could not be loaded."); }
    finally { setLoading(false); }
  }, [ticketId]);
  useEffect(() => { void loadTicket(); }, [loadTicket]);

  async function sendReply(event: FormEvent) {
    event.preventDefault(); setError(""); setSent(false);
    if (!reply.trim()) { setError("Write a reply before sending."); return; }
    setSending(true);
    try { const response = await fetch(`/api/support/tickets/${ticketId}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: reply }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Reply could not be sent."); setReply(""); setSent(true); await loadTicket(); }
    catch (e) { setError(e instanceof Error ? e.message : "Reply could not be sent."); }
    finally { setSending(false); }
  }

  return <main className="support-page support-detail-page"><div className="support-breadcrumb"><Link href="/dashboard">Dashboard</Link><span>›</span><Link href="/support">Support</Link><span>›</span><strong>Ticket</strong></div>
    {loading ? <div className="support-tickets-loading">Loading ticket…</div> : !ticket ? <div className="support-alert error" role="alert">{error || "Ticket not found."}<p><Link href="/support">Back to Support Center</Link></p></div> : <>
      <section className="support-detail-heading"><div><span>{ticket.ticketNumber}</span><h1>{ticket.title}</h1><p>Submitted {dateTime(ticket.createdAt)}</p></div><div className="support-ticket-badges"><span className={`support-priority ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span><span className={`support-status ${ticket.status.toLowerCase().replaceAll(" ", "-")}`}>{ticket.status}</span></div></section>
      <section className="support-conversation"><h2>Conversation</h2><article className="support-message-card initial"><div className="support-message-meta"><strong>Your request</strong><time>{dateTime(ticket.createdAt)}</time></div><p>{ticket.description}</p></article>{messages.map((message) => <article className={`support-message-card ${message.senderType === "admin" ? "admin" : "user"}`} key={message.id}><div className="support-message-meta"><strong>{message.senderType === "admin" ? "Support team" : "You"}</strong><time>{dateTime(message.createdAt)}</time></div><p>{message.message}</p></article>)}
        {error && <div className="support-alert error" role="alert">{error}</div>}{sent && <div className="support-alert success" role="status">Your reply was sent.</div>}
        <form className="support-reply-form" onSubmit={sendReply}><label htmlFor="support-reply">Add a reply</label><textarea id="support-reply" rows={4} maxLength={2000} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a message to our support team…"/><div><small>{reply.length}/2000 characters</small><button className="support-submit-button" type="submit" disabled={sending || !reply.trim()}><span>➤</span>{sending ? "Sending…" : "Send Reply"}</button></div></form>
      </section>
      <Link className="support-back-link" href="/support">← Back to My Tickets</Link>
    </>}
  </main>;
}
