import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { NavLink } from "@/components/nav-link";
import { getNavItemsForRole } from "@/lib/navigation";
import type { SessionUser } from "@/lib/types";

interface Props {
  children: ReactNode;
  title: string;
  description?: string;
  badge?: string;
  currentPath: string;
  user?: SessionUser | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AppShell({ children, title, description, badge, currentPath, user }: Props) {
  const isAuthPage = currentPath === "/login" || currentPath === "/";
  const navItems = getNavItemsForRole(user?.role ?? "savings_member");

  return (
    <div className="shell">
      {!isAuthPage && (
        <aside className="sidebar">
          <div className="sidebar-brand">
            <Brand />
          </div>

          {user && (
            <div className="sidebar-user">
              <div className="user-avatar">{getInitials(user.fullName)}</div>
              <div className="user-info">
                <strong className="user-name">{user.fullName}</strong>
                <span className="user-role">{user.role.replace(/_/g, " ")}</span>
              </div>
            </div>
          )}

          <div className="sidebar-panel">
            <p className="sidebar-caption">Operations</p>
            <nav className="nav-stack">
              {navItems.map((item: any) => (
                <NavLink
                  key={item.href}
                  href={item.href as any}
                  icon={item.icon}
                  isActive={currentPath === item.href}
                  label={item.label}
                />
              ))}
            </nav>
          </div>

          <div className="sidebar-footer">
            <NavLink href="/settings" icon={() => <></>} label="Settings" isActive={currentPath === "/settings"} />
          </div>
        </aside>
      )}

      <main className="main-panel">
        {!isAuthPage && (
          <header className="page-header">
            <div>
              {badge ? <span className="page-badge">{badge}</span> : null}
              <h1>{title}</h1>
              {description ? <p>{description}</p> : null}
            </div>
            {user && (
              <div className="page-header-card">
                <span>Signed in as</span>
                <strong>{user.fullName}</strong>
                <span className="table-muted">{user.role.replace(/_/g, " ")}</span>
              </div>
            )}
          </header>
        )}

        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}