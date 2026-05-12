import clsx from "clsx";
import { Award, TrendingUp, DollarSign, Shield } from "lucide-react";

type Props = {
  label: string;
  value: string;
  helper: string;
  tone?: "emerald" | "amber" | "blue" | "rose";
  icon?: React.ReactNode;
};

export function StatCard({ label, value, helper, tone = "blue", icon }: Props) {
  return (
    <article className={clsx("stat-card", `tone-${tone}`)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ opacity: 0.7 }}>{icon}</span>}
        <span className="stat-label">{label}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      <p className="stat-helper">{helper}</p>
    </article>
  );
}