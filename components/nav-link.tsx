import clsx from "clsx";
import Link from "next/link";
import type { ComponentType } from "react";

type Props = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive?: boolean;
};

export function NavLink({ href, label, icon: Icon, isActive = false }: Props) {
  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={clsx("nav-link", isActive && "nav-link-active")}
      href={href}
    >
      <Icon className="nav-icon" />
      <span>{label}</span>
    </Link>
  );
}
