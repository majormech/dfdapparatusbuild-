"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/apparatus", label: "Apparatus", icon: "▤" },
  { href: "/apparatus/new", label: "Add apparatus", icon: "+" },
  { href: "/admin", label: "Admin", icon: "⚙" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <button className="icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>☰</button>
        <Brand compact />
        <span />
      </header>
      {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-topline" />
        <Brand />
        <button className="sidebar-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}>×</button>

        <nav className="primary-nav" aria-label="Main navigation">
          <p className="nav-label">Operations</p>
          {navigation.map((item) => {
            const active = item.href === "/"
              ? pathname === "/" || pathname.startsWith("/stations/")
              : pathname === item.href || (item.href === "/apparatus" && pathname.startsWith("/apparatus/") && pathname !== "/apparatus/new");
            return (
              <Link key={item.href} href={item.href} className={active ? "nav-link nav-link-active" : "nav-link"} onClick={() => setMenuOpen(false)}>
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-status">
          <div className="status-title"><span className="live-dot" /> Inventory online</div>
          <p>D1 records synced</p>
        </div>
        <div className="sidebar-footer">
          <div className="avatar">DF</div>
          <div><strong>DFD Logistics</strong><span>Equipment Control</span></div>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={compact ? "brand brand-compact" : "brand"}>
      <span className="brand-mark">DFD</span>
      <span className="brand-copy"><strong>APPARATUS</strong><small>INVENTORY CONTROL</small></span>
    </Link>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}
