"use client";

import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/layout/NotificationBell";

const navItems = [
  { label: "Home", href: "/dashboard", icon: "⌂" },
  { label: "Stats", href: "/transactions", icon: "▥" },
  { label: "Cards", href: "/cards", icon: "▣" },
  { label: "Profile", href: "/profile", icon: "♙" },
];

function isNavActive(label: string, pathname: string) {
  if (label === "Home") return pathname === "/dashboard";
  if (label === "Stats") return pathname === "/transactions";
  if (label === "Cards") return pathname.startsWith("/cards");
  if (label === "Profile") return pathname.startsWith("/profile") || pathname.startsWith("/settings");
  return false;
}

export default function AppShell({ children, unreadCount = 0 }: { children: ReactNode; unreadCount?: number }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const pathname = usePathname();
  return <div className="app-shell">
    <header className="app-topbar">
      <div className="app-topbar-inner">
        <button type="button" className="app-icon-button hamburger-button" aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><span>☰</span></button>
        <a className="app-wordmark" href="/dashboard"><b>NORDSTONE</b><span>BANK</span></a>
        <div className="app-top-actions">
          <NotificationBell unreadCount={unreadCount}/>
          <a className="app-icon-button help-button" href="/support" aria-label="Help">?</a>
        </div>
      </div>
    </header>
    {menuOpen && <div className="app-drawer-backdrop" onClick={() => setMenuOpen(false)}><aside className="app-drawer" onClick={(event) => event.stopPropagation()}><div className="app-drawer-head"><a className="app-wordmark" href="/dashboard"><b>NORDSTONE</b><span>BANK</span></a><button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>×</button></div><nav>{[["Dashboard", "/dashboard"], ["Account Information", "/account"], ["Send Money", "/transfer"], ["Deposit", "/deposit"], ["Transactions", "/transactions"], ["Your Cards", "/cards"], ["Profile", "/profile"], ["Support", "/support"]].map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}<span>›</span></a>)}</nav></aside></div>}
    <div className="app-main-wrap">{children}</div>
    {quickOpen && <div className="app-quick-backdrop" onClick={() => setQuickOpen(false)}><div className="app-quick-menu" onClick={(event) => event.stopPropagation()}><button type="button" className="quick-menu-close" aria-label="Close quick menu" onClick={() => setQuickOpen(false)}>×</button><h2>Quick Actions</h2><a href="/transfer" onClick={() => setQuickOpen(false)}>Send Money <span>›</span></a><a href="/transactions" onClick={() => setQuickOpen(false)}>Transactions <span>›</span></a><a href="/cards" onClick={() => setQuickOpen(false)}>Cards <span>›</span></a><a href="/profile" onClick={() => setQuickOpen(false)}>Profile <span>›</span></a></div></div>}
    <nav className="app-bottom-nav" aria-label="Main navigation">
      <a href={navItems[0].href} className={isNavActive(navItems[0].label, pathname) ? "active" : ""}><span>{navItems[0].icon}</span><small>{navItems[0].label}</small></a>
      <a href={navItems[1].href} className={isNavActive(navItems[1].label, pathname) ? "active" : ""}><span>{navItems[1].icon}</span><small>{navItems[1].label}</small></a>
      <button type="button" className="nav-grid-button" aria-label="Open quick access" onClick={() => setQuickOpen(true)}><span>▦</span></button>
      <a href={navItems[2].href} className={isNavActive(navItems[2].label, pathname) ? "active" : ""}><span>{navItems[2].icon}</span><small>{navItems[2].label}</small></a>
      <a href={navItems[3].href} className={isNavActive(navItems[3].label, pathname) ? "active" : ""}><span>{navItems[3].icon}</span><small>{navItems[3].label}</small></a>
    </nav>
  </div>;
}
