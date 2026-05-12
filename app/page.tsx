import Link from "next/link";
import { ArrowRight, DatabaseZap, Landmark, Smartphone, Shield, BarChart3, Users2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";

export default function HomePage() {
  return (
    <div className="landing">
      <header className="hero">
        <section className="hero-copy">
          <Brand />
          <div style={{ marginTop: 24 }}>
            <span className="eyebrow">Professional Microfinance Management</span>
            <h1>Run your SACCO operations with a modern, secure, and powerful digital platform.</h1>
            <p>
              Built on Next.js 16, React 19, and Supabase — this portal replaces legacy systems
              with a clean, production-ready financial management ecosystem. Real-time M-PESA
              integration, full loan lifecycle tracking, and role-based access control.
            </p>
          </div>
          <div className="cta-row">
            <Link className="btn-primary" href="/dashboard">
              Launch Dashboard
              <ArrowRight size={18} />
            </Link>
            <Link className="btn-secondary" href="/login">
              Sign In
            </Link>
          </div>
          <div className="metric-grid" style={{ marginTop: 32 }}>
            <StatCard label="Active Members" value="412" helper="Registered across all counties" tone="emerald" />
            <StatCard label="Live Portfolio" value="KES 8.4M" helper="Approved and disbursed loans" tone="blue" />
            <StatCard label="Savings Held" value="KES 2.3M" helper="Multi-bucket member savings" tone="amber" />
            <StatCard label="Recovery Rate" value="94.2%" helper="Portfolio quality benchmark" tone="rose" />
          </div>
        </section>

        <aside className="hero-panel">
          <span className="eyebrow">Why SBC Modern Core</span>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", marginBottom: 16, marginTop: 8 }}>
            Built for Kenyan SACCOs
          </h2>
          <p className="table-muted" style={{ marginBottom: 20 }}>
            Purpose-engineered for savings and credit cooperatives in Kenya. Supports M-PESA
            Daraja callbacks, field officer workflows, and multi-bucket savings with purpose-pool
            allocations — all backed by PostgreSQL.
          </p>
          <div className="highlight-list">
            <div className="highlight-item">
              <strong>Next.js App Router</strong>
              <p className="table-muted">Server components for data loading, client components for rich interactions.</p>
            </div>
            <div className="highlight-item">
              <strong>Supabase SQL Workflow</strong>
              <p className="table-muted">Full bootstrap + delta migrations for versioned schema evolution.</p>
            </div>
            <div className="highlight-item">
              <strong>M-PESA Daraja Integration</strong>
              <p className="table-muted">Callback ingestion and transaction matching ready for live credentials.</p>
            </div>
            <div className="highlight-item">
              <strong>Role-Based Access</strong>
              <p className="table-muted">Admin, loan officer, field officer, and member dashboards.</p>
            </div>
          </div>
        </aside>
      </header>

      <div className="two-up" style={{ marginTop: 28 }}>
        <SectionCard
          title="Core Capabilities"
          description="Everything you need to run a modern microfinance operation."
        >
          <div className="three-up">
            <div className="mini-stat">
              <span className="mini-label">
                <Landmark size={14} style={{ verticalAlign: "middle" }} /> Loan Lifecycle
              </span>
              <strong className="mini-value">Full Pipeline</strong>
              <p className="table-muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                Application → Credit scoring → Approval → Disbursement → Repayment → Close
              </p>
            </div>
            <div className="mini-stat">
              <span className="mini-label">
                <Smartphone size={14} style={{ verticalAlign: "middle" }} /> M-PESA Payments
              </span>
              <strong className="mini-value">Live Callbacks</strong>
              <p className="table-muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                Real-time transaction capture via Daraja API with auto-matching
              </p>
            </div>
            <div className="mini-stat">
              <span className="mini-label">
                <BarChart3 size={14} style={{ verticalAlign: "middle" }} /> Savings Buckets
              </span>
              <strong className="mini-value">5-Bucket Model</strong>
              <p className="table-muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                Mandatory, shares, multiplier, withdrawable, and rounded bucket
              </p>
            </div>
          </div>
          <div className="three-up" style={{ marginTop: 16 }}>
            <div className="mini-stat">
              <span className="mini-label">
                <DatabaseZap size={14} style={{ verticalAlign: "middle" }} /> Data Integrity
              </span>
              <strong className="mini-value">Clean Slate</strong>
              <p className="table-muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                No dummy data. Production-ready with proper constraints and triggers.
              </p>
            </div>
            <div className="mini-stat">
              <span className="mini-label">
                <Shield size={14} style={{ verticalAlign: "middle" }} /> Security
              </span>
              <strong className="mini-value">RBAC Enabled</strong>
              <p className="table-muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                Role-based dashboards with Supabase Row Level Security
              </p>
            </div>
            <div className="mini-stat">
              <span className="mini-label">
                <Users2 size={14} style={{ verticalAlign: "middle" }} /> Client Management
              </span>
              <strong className="mini-value">Full CRM</strong>
              <p className="table-muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                Members, guarantors, collateral, visits, and follow-ups
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Getting Started"
          description="Three steps to go from zero to live operations."
        >
          <ol className="bullet-list" style={{ counterReset: "step-counter", listStyle: "none", paddingLeft: 0 }}>
            <li style={{ counterIncrement: "step-counter", paddingLeft: 8 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24, borderRadius: "50%", background: "var(--gradient-emerald)",
                color: "#fff", fontSize: "0.75rem", fontWeight: 800, marginRight: 8
              }}>1</span>
              <strong>Deploy the database</strong> — Run <code>database/fullupdate.sql</code> in the Supabase SQL editor to create all tables, triggers, and views.
            </li>
            <li style={{ counterIncrement: "step-counter", paddingLeft: 8, marginTop: 12 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24, borderRadius: "50%", background: "var(--gradient-primary)",
                color: "#fff", fontSize: "0.75rem", fontWeight: 800, marginRight: 8
              }}>2</span>
              <strong>Configure environment</strong> — Add Supabase URL, anon key, and service role key to your <code>.env</code> file.
            </li>
            <li style={{ counterIncrement: "step-counter", paddingLeft: 8, marginTop: 12 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24, borderRadius: "50%", background: "var(--gradient-amber)",
                color: "#fff", fontSize: "0.75rem", fontWeight: 800, marginRight: 8
              }}>3</span>
              <strong>Add Daraja credentials</strong> — Configure M-PESA consumer key/secret, shortcode, passkey, and callback URL for live payment processing.
            </li>
          </ol>
          <div className="three-up" style={{ marginTop: 20 }}>
            <StatCard
              label="Collection Today"
              value="KES 118,500"
              helper="Mock dashboard target for live reporting"
              tone="emerald"
            />
            <StatCard
              label="Purpose Pool"
              value="KES 386,400"
              helper="Company-side retained allocations"
              tone="amber"
            />
            <StatCard
              label="Member Savings"
              value="KES 2,310,000"
              helper="Portfolio-aware member balances"
              tone="blue"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}