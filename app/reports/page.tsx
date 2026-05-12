"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency } from "@/lib/format";
import { getReportsSnapshot } from "@/lib/data";
import type { ReportsSnapshot } from "@/lib/types";

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
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <AppShell title="Reports" description="Loading..." badge="Reporting" currentPath="/reports">
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading reports…</div>
      </AppShell>
    );
  }

  if (!reports) {
    return (
      <AppShell title="Reports" description="Unable to load reports" badge="Reporting" currentPath="/reports">
        <EmptyState title="Unable to load reports" description="Please check your Supabase connection and try again." />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Reports"
      description="A compact finance view inspired by the current portfolio and company mathematics pages."
      badge="Reporting"
      currentPath="/reports"
    >
      <div className="metric-grid">
        <StatCard label="Active Portfolio" value={formatCurrency(reports.activePortfolio)} helper="Approved and live loans" tone="blue" />
        <StatCard label="Member Savings" value={formatCurrency(reports.memberSavings)} helper="Held member balances" tone="emerald" />
        <StatCard label="Purpose Pool" value={formatCurrency(reports.purposePool)} helper="Company-side retained allocations" tone="amber" />
        <StatCard label="Collections Today" value={formatCurrency(reports.collectionToday)} helper="Expected live dashboard figure" tone="rose" />
      </div>

      <div className="two-up" style={{ marginTop: 22 }}>
        <SectionCard title="Loan Status Breakdown" description="Distribution of loans across workflow stages.">
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Active", count: reports.loanBreakdown.active },
                  { label: "Approved", count: reports.loanBreakdown.approved },
                  { label: "Pending", count: reports.loanBreakdown.pending },
                  { label: "Defaulted", count: reports.loanBreakdown.defaulted },
                  { label: "Completed", count: reports.loanBreakdown.completed },
                ].map((row) => {
                  const total = Math.max(
                    row.count +
                    (reports.loanBreakdown.active +
                      reports.loanBreakdown.approved +
                      reports.loanBreakdown.pending +
                      reports.loanBreakdown.defaulted +
                      reports.loanBreakdown.completed || 1),
                    1
                  );
                  return (
                    <tr className="table-row" key={row.label}>
                      <td>
                        <span
                          className={`status-pill status-pill-${row.label.toLowerCase()}`}
                        >
                          {row.label}
                        </span>
                      </td>
                      <td>{row.count}</td>
                      <td className="table-muted">{((row.count / total) * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Savings Breakdown" description="Distribution across mandatory, shares, multiplier, and withdrawable buckets.">
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr>
                  <th>Bucket</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Mandatory", amount: reports.savingsBreakdown.mandatory },
                  { label: "Shares", amount: reports.savingsBreakdown.shares },
                  { label: "Multiplier", amount: reports.savingsBreakdown.multiplier },
                  { label: "Withdrawable", amount: reports.savingsBreakdown.withdrawable },
                ].map((row) => (
                  <tr className="table-row" key={row.label}>
                    <td>{row.label}</td>
                    <td>{formatCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {reports.topClients && reports.topClients.length > 0 && (
        <SectionCard
          title="Top Clients by Outstanding Balance"
          description="Members with the highest current loan exposure."
          style={{ marginTop: 22 }}
        >
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr>
                  <th>Member</th>
                  <th>Total Loans</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {reports.topClients.map((client, i) => (
                  <tr className="table-row" key={i}>
                    <td><strong>{client.name}</strong></td>
                    <td>{formatCurrency(client.totalLoans)}</td>
                    <td>{formatCurrency(client.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <div className="two-up" style={{ marginTop: 22 }}>
        <SectionCard
          title="Why this matters"
          description="The new SQL structure was designed to support real reporting instead of fragile calculated pages."
        >
          <ul className="bullet-list">
            <li>Purpose-pool allocations have their own ledger table.</li>
            <li>Loan payment breakdowns can separate principal, savings, and rounding buckets.</li>
            <li>Historical overrides and member transfers are stored instead of inferred ad hoc.</li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Next reporting upgrades"
          description="These are now straightforward once live Supabase data is connected."
        >
          <ul className="bullet-list">
            <li>Officer productivity and field-visit dashboards.</li>
            <li>Overdue aging buckets with penalty exposure.</li>
            <li>Member-level savings reconciliation and purpose-pool summaries.</li>
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}