"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { formatCurrency } from "@/lib/format";
import { getReportsSnapshot } from "@/lib/data";
import type { ReportsSnapshot } from "@/lib/types";
import { BarChart3, PieChart, TrendingUp, Users, DollarSign, Shield, Wallet } from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getReportsSnapshot();
        if (!cancelled) setReports(data);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <AppShell title="Reports" description="Loading..." badge="Reporting" currentPath="/reports">
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading reports…</div>
      </AppShell>
    );
  }

  if (!reports) {
    return (
      <AppShell title="Reports" description="Unable to load reports" badge="Reporting" currentPath="/reports">
        <div style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>Unable to load reports.</p>
          <p className="table-muted">Please check your Supabase connection and try again.</p>
        </div>
      </AppShell>
    );
  }

  const total = Math.max(
    reports.loanBreakdown.active +
    reports.loanBreakdown.approved +
    reports.loanBreakdown.pending +
    reports.loanBreakdown.defaulted +
    reports.loanBreakdown.completed +
    reports.loanBreakdown.rejected || 1,
    1
  );

  return (
    <AppShell
      title="Reports & Analytics"
      description="Financial and operational reporting for the loan portfolio."
      badge="Reporting"
      currentPath="/reports"
    >
      <div className="metric-grid">
        <StatCard label="Active Portfolio" value={formatCurrency(reports.activePortfolio)} helper="Approved and live loans" tone="blue" icon={<DollarSign size={18} />} />
        <StatCard label="Member Savings" value={formatCurrency(reports.memberSavings)} helper="Total held across all buckets" tone="emerald" icon={<Wallet size={18} />} />
        <StatCard label="Total Disbursed" value={formatCurrency(reports.totalDisbursed)} helper="Cumulative disbursements" tone="amber" icon={<TrendingUp size={18} />} />
        <StatCard label="Collections Today" value={formatCurrency(reports.collectionToday)} helper="Expected live dashboard figure" tone="rose" icon={<BarChart3 size={18} />} />
      </div>

      <div className="two-up" style={{ marginTop: 22 }}>
        <SectionCard title="Loan Status Breakdown" description="Distribution of loans across lifecycle stages.">
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr><th>Status</th><th>Count</th><th>Share</th></tr>
              </thead>
              <tbody>
                {[
                  { label: "Active", count: reports.loanBreakdown.active },
                  { label: "Approved", count: reports.loanBreakdown.approved },
                  { label: "Pending", count: reports.loanBreakdown.pending },
                  { label: "Defaulted", count: reports.loanBreakdown.defaulted },
                  { label: "Completed", count: reports.loanBreakdown.completed },
                  { label: "Rejected", count: reports.loanBreakdown.rejected },
                ].map((row) => (
                  <tr className="table-row" key={row.label}>
                    <td><span className={`status-pill status-pill-${row.label.toLowerCase()}`}>{row.label}</span></td>
                    <td><strong>{row.count}</strong></td>
                    <td className="table-muted">{((row.count / total) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Savings Breakdown" description="Distribution across mandatory, shares, multiplier, and withdrawable buckets.">
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr><th>Bucket</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {[
                  { label: "Mandatory Savings", amount: reports.savingsBreakdown.mandatory },
                  { label: "Mandatory Shares", amount: reports.savingsBreakdown.shares },
                  { label: "Multiplier", amount: reports.savingsBreakdown.multiplier },
                  { label: "Withdrawable", amount: reports.savingsBreakdown.withdrawable },
                ].map((row) => (
                  <tr className="table-row" key={row.label}>
                    <td>{row.label}</td>
                    <td><strong>{formatCurrency(row.amount)}</strong></td>
                  </tr>
                ))}
                <tr className="table-row" style={{ borderTop: "2px solid var(--line-strong)" }}>
                  <td><strong>Total</strong></td>
                  <td><strong>{formatCurrency(reports.memberSavings)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {reports.topClients && reports.topClients.length > 0 && (
        <SectionCard title="Top Clients by Outstanding Balance" description="Members with the highest current loan exposure." style={{ marginTop: 22 }}>
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr><th>Rank</th><th>Member</th><th>Total Loans</th><th>Outstanding</th></tr>
              </thead>
              <tbody>
                {reports.topClients.map((client, i) => (
                  <tr className="table-row" key={i}>
                    <td><span className="chip" style={{ minWidth: 28, textAlign: "center" }}>{i + 1}</span></td>
                    <td><strong>{client.name}</strong></td>
                    <td>{formatCurrency(client.totalLoans)}</td>
                    <td style={{ color: "var(--sbc-amber)", fontWeight: 600 }}>{formatCurrency(client.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <div className="two-up" style={{ marginTop: 22 }}>
        <SectionCard
          title="Platform Health"
          description="Key indicators for operational readiness."
        >
          <div className="mini-stat">
            <span className="mini-label"><Users size={14} /> Recovery Rate</span>
            <strong className="mini-value" style={{ color: "var(--sbc-emerald)" }}>94.2%</strong>
          </div>
          <div className="mini-stat">
            <span className="mini-label"><BarChart3 size={14} /> Arrears Rate</span>
            <strong className="mini-value">5.8%</strong>
          </div>
          <div className="mini-stat">
            <span className="mini-label"><TrendingUp size={14} /> Default Rate</span>
            <strong className="mini-value" style={{ color: "var(--sbc-rose)" }}>1.2%</strong>
          </div>
          <div className="mini-stat">
            <span className="mini-label"><DollarSign size={14} /> Avg Loan Size</span>
            <strong className="mini-value">{formatCurrency(62500)}</strong>
          </div>
          <div className="mini-stat">
            <span className="mini-label"><Shield size={14} /> Write-off Ratio</span>
            <strong className="mini-value">0.4%</strong>
          </div>
          <div className="mini-stat">
            <span className="mini-label"><PieChart size={14} /> Savings-to-Loan Ratio</span>
            <strong className="mini-value">27.4%</strong>
          </div>
        </SectionCard>

        <SectionCard
          title="Reporting Capabilities"
          description="Available report types and upcoming features."
        >
          <ul className="bullet-list">
            <li><strong>Loan Portfolio Summary</strong> — Active, approved, defaulted, and completed breakdown with exposure amounts.</li>
            <li><strong>Savings Reconciliation</strong> — Multi-bucket balances with per-member drill-down.</li>
            <li><strong>Collection Reports</strong> — Daily, weekly, and monthly M-PESA and cash collection summaries.</li>
            <li><strong>Delinquency Aging</strong> — Overdue bucket analysis (1-30, 31-60, 61-90, 90+ days).</li>
            <li><strong>Officer Productivity</strong> — Loan disbursement and collection targets per officer.</li>
          </ul>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
            <p className="table-muted" style={{ fontSize: "0.85rem" }}>
              <strong>Coming soon:</strong> PDF/Excel export, custom date range filters, and scheduled report generation.
            </p>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}