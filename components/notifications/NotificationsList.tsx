"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type NotificationItem = { id: string; type: string; title: string; message: string; link: string | null; isRead: boolean; createdAt: string | Date };
const formattedDate = (date: string | Date, locale: string) => {
  const value = new Date(date);
  const datePart = value.toLocaleDateString(locale, { month: "short", day: "2-digit", year: "numeric" });
  const timePart = value.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${datePart} ${locale === "en-US" ? "at" : "·"} ${timePart}`;
};
function typeIcon(type: string) {
  if (type === "card") return "▣";
  if (type === "loan") return "▤";
  if (type === "kyc" || type === "security") return "♢";
  if (type === "transfer") return "➤";
  if (type === "deposit") return "＋";
  if (type === "support") return "♧";
  return "♧";
}

export default function NotificationsList() {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [busyAll, setBusyAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch("/api/notifications?limit=50", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Notifications could not be loaded."); setItems(body.notifications); }
    catch (e) { setError(e instanceof Error ? e.message : "Notifications could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  function broadcastChange() { window.dispatchEvent(new Event("notifications-updated")); }

  async function markAllRead() {
    setBusyAll(true); setError("");
    try { const response = await fetch("/api/notifications/mark-all-read", { method: "POST" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Notifications could not be updated."); setItems((current) => current.map((item) => ({ ...item, isRead: true }))); broadcastChange(); }
    catch (e) { setError(e instanceof Error ? e.message : "Notifications could not be updated."); }
    finally { setBusyAll(false); }
  }
  async function markRead(item: NotificationItem) {
    if (item.isRead) return;
    setBusyId(item.id); setError("");
    try { const response = await fetch(`/api/notifications/${item.id}/read`, { method: "POST" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Notification could not be updated."); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry)); broadcastChange(); }
    catch (e) { setError(e instanceof Error ? e.message : "Notification could not be updated."); }
    finally { setBusyId(""); }
  }
  async function deleteOne(item: NotificationItem) {
    setBusyId(item.id); setError("");
    try { const response = await fetch(`/api/notifications/${item.id}`, { method: "DELETE" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Notification could not be deleted."); setItems((current) => current.filter((entry) => entry.id !== item.id)); broadcastChange(); }
    catch (e) { setError(e instanceof Error ? e.message : "Notification could not be deleted."); }
    finally { setBusyId(""); }
  }
  async function deleteAll() {
    setBusyAll(true); setError("");
    try { const response = await fetch("/api/notifications", { method: "DELETE" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Notifications could not be deleted."); setItems([]); setConfirmDeleteAll(false); broadcastChange(); }
    catch (e) { setError(e instanceof Error ? e.message : "Notifications could not be deleted."); }
    finally { setBusyAll(false); }
  }

  const hasUnread = items.some((item) => !item.isRead);
  return <main className="notifications-page"><div className="notifications-breadcrumb"><a href="/dashboard">{t("Dashboard")}</a><span>›</span><strong>{t("Notifications")}</strong></div><section className="notifications-page-heading"><div><span>{t("STAY UP TO DATE")}</span><h1>{t("Notifications")}</h1><p>{t("Updates about activity and changes to your account.")}</p></div><div className="notifications-page-actions"><button type="button" className="notifications-outline-button" onClick={() => void markAllRead()} disabled={!hasUnread || busyAll}><span>✓</span>{t("Mark All as Read")}</button><button type="button" className="notifications-outline-button danger" onClick={() => setConfirmDeleteAll(true)} disabled={items.length === 0}><span>▤</span>{t("Delete All")}</button></div></section>
    {error && <div className="notifications-error" role="alert">{error}</div>}
    <section className="notifications-card"><div className="notifications-card-title"><span>♧</span><h2>{t("All Notifications")}</h2><small>{new Intl.NumberFormat(locale).format(items.length)}</small></div>
      {loading ? <div className="notifications-empty">{t("Loading notifications…")}</div> : items.length === 0 ? <div className="notifications-empty"><span className="notifications-empty-icon">♧</span><strong>{t("No notifications yet")}</strong><p>{t("Your notifications will appear here.")}</p></div> : <div className="notifications-list">{items.map((item) => <article key={item.id} className={`notification-row ${item.isRead ? "read" : "unread"}`}><span className={`notification-type-icon ${item.type}`} aria-hidden="true">{typeIcon(item.type)}</span><div className="notification-row-copy"><div className="notification-row-title"><strong>{t(item.title)}</strong>{!item.isRead && <i>{t("New")}</i>}</div><p>{t(item.message)}</p><time>{formattedDate(item.createdAt, locale)}</time></div><div className="notification-row-actions"><button type="button" className="notification-action-read" onClick={() => void markRead(item)} disabled={item.isRead || busyId === item.id}><span>✓</span>{t("Read")}</button><button type="button" className="notification-action-delete" onClick={() => void deleteOne(item)} disabled={busyId === item.id}><span>▤</span>{t("Delete")}</button></div></article>)}</div>}
    </section>
    {confirmDeleteAll && <div className="notifications-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busyAll) setConfirmDeleteAll(false); }}><section className="notifications-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-all-title"><button className="notifications-modal-close" type="button" onClick={() => setConfirmDeleteAll(false)} aria-label={t("Close")} disabled={busyAll}>×</button><span className="notifications-confirm-icon">!</span><h2 id="delete-all-title">{t("Delete all notifications?")}</h2><p>{t("This cannot be undone.")}</p>{error && <div className="notifications-error" role="alert">{t(error)}</div>}<div><button type="button" className="notifications-outline-button" onClick={() => setConfirmDeleteAll(false)} disabled={busyAll}>{t("Cancel")}</button><button type="button" className="notifications-delete-confirm" onClick={() => void deleteAll()} disabled={busyAll}>{busyAll ? t("Deleting…") : t("Delete All")}</button></div></section></div>}
  </main>;
}
