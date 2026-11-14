"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NotificationItem = { id: string; type: string; title: string; message: string; link: string | null; isRead: boolean; createdAt: string | Date };
const relativeTime = (date: string | Date) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [[31536000, "year"], [2592000, "month"], [86400, "day"], [3600, "hour"], [60, "minute"]];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "always" });
  for (const [size, unit] of units) if (seconds >= size) return formatter.format(-Math.floor(seconds / size), unit);
  return seconds < 10 ? "just now" : formatter.format(-seconds, "second");
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

export default function NotificationBell({ unreadCount: initialUnreadCount = 0 }: { unreadCount?: number }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUnreadCount(initialUnreadCount); }, [initialUnreadCount]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  useEffect(() => {
    const refreshUnreadCount = () => {
      fetch("/api/notifications?limit=1", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => { if (body) setUnreadCount(body.unreadCount); }).catch(() => undefined);
    };
    window.addEventListener("notifications-updated", refreshUnreadCount);
    return () => window.removeEventListener("notifications-updated", refreshUnreadCount);
  }, []);
  useEffect(() => {
    if (!open) return;
    setLoading(true); setError("");
    fetch("/api/notifications?limit=5", { cache: "no-store" }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Notifications could not be loaded."); setNotifications(body.notifications); setUnreadCount(body.unreadCount); }).catch((e) => setError(e instanceof Error ? e.message : "Notifications could not be loaded.")).finally(() => setLoading(false));
  }, [open]);

  async function markAllRead() {
    setError("");
    try { const response = await fetch("/api/notifications/mark-all-read", { method: "POST" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not update notifications."); setNotifications((items) => items.map((item) => ({ ...item, isRead: true }))); setUnreadCount(0); window.dispatchEvent(new Event("notifications-updated")); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update notifications."); }
  }
  async function openNotification(item: NotificationItem) {
    if (!item.isRead) {
      try { const response = await fetch(`/api/notifications/${item.id}/read`, { method: "POST" }); if (!response.ok) throw new Error("Could not mark this notification as read."); setNotifications((items) => items.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry)); setUnreadCount((count) => Math.max(0, count - 1)); window.dispatchEvent(new Event("notifications-updated")); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not update notification."); return; }
    }
    if (item.link) { setOpen(false); window.location.assign(item.link); }
  }

  return <div className="notification-bell-wrap" ref={wrapperRef}>
    <button type="button" className="app-icon-button notification-button" aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"} aria-expanded={open} onClick={() => setOpen((value) => !value)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unreadCount > 0 && <i>{unreadCount > 99 ? "99+" : unreadCount}</i>}</button>
    {open && <section className="notification-dropdown" aria-label="Recent notifications"><header><strong>Notifications</strong><button type="button" onClick={() => void markAllRead()} disabled={unreadCount === 0}>Mark all as read</button></header>
      {error && <p className="notification-dropdown-error" role="alert">{error}</p>}
      {loading ? <div className="notification-dropdown-empty">Loading notifications…</div> : notifications.length === 0 ? <div className="notification-dropdown-empty">No notifications yet.</div> : <div className="notification-dropdown-list">{notifications.map((item) => <button type="button" className={`notification-dropdown-item ${item.isRead ? "read" : "unread"}`} key={item.id} onClick={() => void openNotification(item)}><span className={`notification-type-icon ${item.type}`} aria-hidden="true">{typeIcon(item.type)}</span><span className="notification-item-copy"><strong>{item.title}</strong><small>{item.message}</small><time>{relativeTime(item.createdAt)}</time></span>{!item.isRead && <i className="notification-unread-dot"/>}</button>)}</div>}
      <Link href="/notifications" onClick={() => setOpen(false)}>View all notifications</Link>
    </section>}
  </div>;
}
