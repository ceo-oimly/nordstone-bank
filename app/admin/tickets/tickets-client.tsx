"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Ticket = {
  id: string;
  ticketNumber: string;
  userName: string;
  email: string;
  title: string;
  lastMessage: string;
  lastMessageAt: string;
};

export default function AdminTicketsClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/tickets", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Support chats could not be loaded.");
      setTickets(body.tickets);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Support chats could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  return (
    <main className="support-page admin-support-page">
      <header className="admin-support-heading">
        <div><h1>Support Chats</h1><p>Customer conversations appear here when a chat is started.</p></div>
        <button type="button" onClick={() => void loadTickets()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </header>
      {error ? (
        <section className="admin-support-empty" role="alert">
          <h2>Chats could not be loaded</h2><p>{error}</p>
          <button type="button" onClick={() => void loadTickets()}>Try again</button>
        </section>
      ) : loading ? (
        <section className="admin-support-empty" aria-live="polite">Loading support chats…</section>
      ) : tickets.length === 0 ? (
        <section className="admin-support-empty">
          <h2>No support chats yet</h2>
          <p>When a customer starts a chat from Support Center, it will appear here.</p>
        </section>
      ) : (
        <div className="admin-support-table-wrap">
          <table className="admin-support-table">
            <thead><tr><th>Ticket Number</th><th>User Name</th><th>User Email</th><th>Title</th><th>Last Message</th><th>Time</th></tr></thead>
            <tbody>{tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td><Link href={`/admin/tickets/${ticket.id}`}>{ticket.ticketNumber}</Link></td>
                <td>{ticket.userName}</td><td>{ticket.email}</td><td>{ticket.title}</td>
                <td className="admin-support-preview">{ticket.lastMessage}</td>
                <td>{new Date(ticket.lastMessageAt).toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}
