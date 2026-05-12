import clsx from "clsx";

type Props = {
  label: string;
  value: string;
  helper: string;
  tone?: "emerald" | "amber" | "blue" | "rose";
};

export function StatCard({ label, value, helper, tone = "blue" }: Props) {
  return (
    <article className={clsx("stat-card", `tone-${tone}`)}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <p className="stat-helper">{helper}</p>
    </article>
  );
}
