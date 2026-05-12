import type { Role } from "@/lib/types";
import {
  ArrowRightLeft,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  LayoutDashboard,
  Landmark,
  Settings,
  ShieldCheck,
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/loans", label: "Loans", icon: Landmark },
  { href: "/savings", label: "Savings", icon: CircleDollarSign },
  { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { href: "/sync", label: "Sync Center", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export const roleOptions: Role[] = [
  "admin",
  "loan_officer",
  "field_officer",
  "savings_member",
];
