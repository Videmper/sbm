import Link from "next/link";
import { ArrowRight, DatabaseZap, Landmark, Smartphone } from "lucide-react";
import { Brand } from "@/components/brand";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { mockDashboard, mockReports, mockSettings } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="landing">
      <header className="hero">
        <section className="hero-copy">
          <Brand />
          <div style={{ marginTop: 24 }}>
            <span className="eyebrow">Modernization in Motion</span>
            <h1>Loan operations, savings, sync, and M-PESA in one modern build.</h1>
            <p>
              This Next.js foundation keeps your current PHP system safe while
              we move the experience to a cleaner React app backed by a
              Supabase-ready Postgres schema.
            </p>
          </div>
          <div className="cta-row">
            <Link className="btn-primary" href="/dashboard">
              Open dashboard
              <ArrowRight size={18} />
            </Link>
            <Link className="btn-secondary" href="/login">
              Preview sign-in
            </Link>
          </div>
          <div className="metric-grid">
            {mockDashboard.metrics.map((metric) => (
              <StatCard
                key={metric.label}
                helper={metric.helper}
                label={metric.label}
                tone={metric.tone}
                value={metric.value}
              />
            ))}
          </div>
        </section>

        <aside className="hero-panel">
          <span className="eyebrow">Why this stack</span>
          <div className="highlight-list">
            <div className="highlight-item">
              <strong>Next.js App Router</strong>
              <p className="table-muted">
                Better structure for dashboards, server data loading, and future
                API routes.
              </p>
            </div>
            <div className="highlight-item">
              <strong>Supabase SQL workflow</strong>
              <p className="table-muted">
                You now have a dedicated `fullupdate.sql` plus an updates folder
                for every future schema change.
              </p>
            </div>
            <div className="highlight-item">
              <strong>M-PESA ready path</strong>
              <p className="table-muted">
                Callback ingestion is already scaffolded, waiting for live
                Daraja credentials.
              </p>
            </div>
          </div>
        </aside>
      </header>

      <div className="two-up" style={{ marginTop: 22 }}>
        <SectionCard
          title="What’s already prepared"
          description="The new foundation covers the pieces you asked for first."
        >
          <div className="three-up">
            <div className="mini-stat">
              <span className="mini-label">
                <Landmark size={14} style={{ verticalAlign: "middle" }} /> Loan
                domain
              </span>
              <strong className="mini-value">Clients, loans, savings, reports</strong>
            </div>
            <div className="mini-stat">
              <span className="mini-label">
                <DatabaseZap size={14} style={{ verticalAlign: "middle" }} /> Database
              </span>
              <strong className="mini-value">Supabase bootstrap and delta SQL</strong>
            </div>
            <div className="mini-stat">
              <span className="mini-label">
                <Smartphone size={14} style={{ verticalAlign: "middle" }} /> Payments
              </span>
              <strong className="mini-value">M-PESA callback capture route</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Immediate rollout steps"
          description="These are the next actions to go from scaffold to live data."
        >
          <ol className="bullet-list">
            {mockSettings.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="three-up" style={{ marginTop: 20 }}>
            <StatCard
              label="Collection Today"
              value={`KES ${mockReports.collectionToday.toLocaleString()}`}
              helper="Mock dashboard target for live reporting"
              tone="emerald"
            />
            <StatCard
              label="Purpose Pool"
              value={`KES ${mockReports.purposePool.toLocaleString()}`}
              helper="Ready for company mathematics reporting"
              tone="amber"
            />
            <StatCard
              label="Savings Held"
              value={`KES ${mockReports.memberSavings.toLocaleString()}`}
              helper="Portfolio-aware member balances"
              tone="blue"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
