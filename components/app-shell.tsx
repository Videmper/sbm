import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { NavLink } from "@/components/nav-link";
import { navItems } from "@/lib/navigation";

type Props = {
  children: ReactNode;
  title: string;
  description: string;
  badge?: string;
  currentPath: string;
};

export function AppShell({
  children,
  title,
  description,
  badge,
  currentPath,
}: Props) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-panel">
          <p className="sidebar-caption">Operations</p>
          <nav className="nav-stack">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                isActive={currentPath === item.href}
                label={item.label}
              />
            ))}
          </nav>
        </div>
        <div className="sidebar-note">
          <p>Modern rollout track</p>
          <strong>Next.js frontend with Supabase-ready finance tables.</strong>
        </div>
      </aside>

      <main className="main-panel">
        <header className="page-header">
          <div>
            {badge ? <span className="page-badge">{badge}</span> : null}
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className="page-header-card">
            <span>Migration Mode</span>
            <strong>Parallel run with PHP preserved</strong>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
