import type { Role } from "@/lib/types";
import { ComponentType } from "react";
import {
  ArrowRightLeft,
  Building2,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  LayoutDashboard,
  Landmark,
  Settings,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<any>;
  roles?: Role[]; // if omitted, visible to all
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/loans", label: "Loans", icon: Landmark },
  { href: "/loan-simulator", label: "Loan Simulator", icon: Calculator },
  { href: "/savings", label: "Savings", icon: CircleDollarSign },
  { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { href: "/sync", label: "Sync Center", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const roleOptions: Role[] = [
  "admin",
  "loan_officer",
  "field_officer",
  "savings_member",
];

export function getNavItemsForRole(role: Role): NavItem[] {
  // Role-based visibility rules
  const roleVisibility: Partial<Record<Role, string[]>> = {
    admin: ["*"], // admin sees everything
    loan_officer: [
      "/dashboard",
      "/clients",
      "/loans",
      "/loan-simulator",
      "/savings",
      "/transactions",
      "/reports",
      "/settings",
    ],
    field_officer: [
      "/dashboard",
      "/clients",
      "/loans",
      "/transactions",
      "/sync",
    ],
    savings_member: [
      "/dashboard",
      "/savings",
      "/transactions",
    ],
  };

  const allowed = roleVisibility[role];
  if (!allowed) return navItems;
  if (allowed.includes("*")) return navItems;
  return navItems.filter((item) => allowed.includes(item.href));
}