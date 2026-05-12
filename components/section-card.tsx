import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  style?: React.CSSProperties;
};

export function SectionCard({ title, description, children, style }: Props) {
  return (
    <section className="section-card" style={style}>
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}