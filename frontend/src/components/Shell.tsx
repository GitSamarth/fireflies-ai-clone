"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import CreateMeetingModal from "./CreateMeetingModal";
import { useToast } from "./Toast";

const NAV = [
  { href: "/", label: "Meetings", icon: "▤" },
  { href: "/apps", label: "AI Apps", icon: "✦" },
  { href: "/integrations", label: "Integrations", icon: "⇄" },
  { href: "/team", label: "Team", icon: "☺" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/meetings") : path.startsWith(href));
  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/" className="brand"><span className="logo">F</span> Fireflies<span className="clone">clone</span></Link>
        <button className="btn primary wide" onClick={() => setCreating(true)}>+ Add meeting</button>
        <nav>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={active(n.href) ? "nav on" : "nav"} aria-current={active(n.href) ? "page" : undefined}>
              <span className="ico">{n.icon}</span>{n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div className="spacer" />
          <button className="icon-btn" aria-label="Notifications" onClick={() => toast("You're all caught up — no new notifications.", "info")}>🔔</button>
          <div className="menu-wrap">
            <button className="avatar" aria-label="Profile menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>DU</button>
            {menu && (
              <div className="menu" onMouseLeave={() => setMenu(false)}>
                <div className="menu-head"><b>Demo User</b><small>demo@example.com</small></div>
                <Link href="/settings" onClick={() => setMenu(false)}>Settings</Link>
                <button onClick={() => { setMenu(false); toast("Authentication is mocked — you're always signed in as the demo user.", "info"); }}>Sign out</button>
              </div>
            )}
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      {creating && <CreateMeetingModal onClose={() => setCreating(false)} />}
    </div>
  );
}
