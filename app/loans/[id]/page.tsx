"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { getLoanById, getClientsSnapshot } from "@/lib/data";
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, DollarSign, Percent, Calendar } from "lucide-react";
import type { LoanRecord, PaymentBreakdownRecord } from "@/lib/types";

export default function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    (async () => {
      const resolved = await params;
      const { id } = resolved;
      if (!id) {
        router.push("/loans");
        return;
      }
      const data = await getLoanById(id);
      setLoan(data);
      setLoading(false);
    })();
  }, [params, router]);

  if (loading) {
    return (
      <AppShell title="Loan" currentPath="/loans">
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading loan details…</div>
      </AppShell>
    );
  }

  if (!loan) {
    return (
      <AppShell title="Loan" currentPath="/loans">
        <div style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>Loan not found.</p>
          <button className="btn-secondary" onClick={() => router.push("/loans")}>Back to Loans</button>
        </div>
      </AppShell>
    );
  }

  const totalPaid = loan.paymentBreakdowns.reduce((sum, b) => sum + b.loanAmount, 0);
  const remainingBalance = Math.max(loan.principal - totalPaid, 0);

  return (
    <AppShell
      title={`Loan: ${loan.clientName}`}
      description="Individual loan detail with payment breakdown and financial tracking."
      badge="Loan Detail"
      currentPath="/loans"
    >
      <button className="btn-secondary" onClick={() => router.push("/loans")} style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 8 }}>
        <ArrowLeft size={16} /> Back to Portfolio
      </button>

      {/* Loan Overview */}
      <SectionCard title="Loan Overview" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ marginBottom: 8 }}>{loan.clientName}</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <span className={`status-pill status-pill-${loan.status}`}>{loan.status}</span>
              <span className="chip">{loan.category}</span>
              <span className="chip">{loan.repaymentFrequency}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
              {formatCurrency(loan.principal)}
            </div>
            <div className="table-muted">Principal</div>
          </div>
        </div>

        <div className="metric-grid" style={{ marginTop: 20 }}>
          <StatCard label="Balance" value={formatCurrency(remainingBalance)} helper={`of ${formatCurrency(loan.principal)} principal`} tone="blue" />
          <StatCard label="Interest" value={formatCurrency(loan.interestAmount)} helper={`Rate: ${loan.interestRate}%`} tone="amber" />
          <StatCard label="Total Repayment" value={formatCurrency(loan.totalRepayment)} helper={`Net disbursed: ${formatCurrency(loan.netDisbursed)}`} tone="emerald" />
          <StatCard label="Due Date" value={formatDate(loan.dueDate)} helper={`${loan.termWeeks} weeks • ${loan.loanPeriodDays} days`} tone="rose" />
        </div>
      </SectionCard>

      {/* Loan Charges Breakdown */}
      <SectionCard title="Loan Charges" description="Full breakdown of fees and deductions." style={{ marginBottom: 22 }}>
        <div className="table-wrap">
          <table>
            <thead className="table-head">
              <tr><th>Item</th><th>Amount</th></tr>
            </thead>
            <tbody>
              <tr><td>Principal</td><td><strong>{formatCurrency(loan.principal)}</strong></td></tr>
              <tr><td>Interest</td><td>{formatCurrency(loan.interestAmount)}</td></tr>
              <tr><td>Processing Fee</td><td>{formatCurrency(loan.processingFee)}</td></tr>
              <tr><td>Insurance Fee</td><td>{formatCurrency(loan.insuranceFee)}</td></tr>
              <tr><td>Funds Transfer Fee</td><td>{formatCurrency(loan.fundsTransferFee)}</td></tr>
              <tr><td>Collateral Joint Fee</td><td>{formatCurrency(loan.collateralJointFee)}</td></tr>
              <tr><td>Total Deductions</td><td style={{ fontWeight: 800 }}>{formatCurrency(loan.totalDeductions)}</td></tr>
              <tr><td>Total Repayment</td><td style={{ fontWeight: 800, color: "var(--sbc-emerald)" }}>{formatCurrency(loan.totalRepayment)}</td></tr>
              <tr><td>Net Disbursed</td><td style={{ fontWeight: 800 }}>{formatCurrency(loan.netDisbursed)}</td></tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 4, marginTop: 24, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 0 }}>
        {[
          { key: "overview", label: "Overview" },
          { key: "payments", label: `Payments (${loan.paymentBreakdowns.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 16px", border: "none", background: "transparent",
              color: activeTab === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--sbc-primary)" : "2px solid transparent",
              cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, fontFamily: "var(--font-body)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <div className="two-up">
            <SectionCard title="Workflow Status">
              <div className="mini-stat">
                <span className="mini-label"><Clock size={14} /> Workflow</span>
                <strong className="mini-value" style={{ fontSize: "1rem", color: "var(--text-primary)" }}>
                  {loan.workflowStatus.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </strong>
              </div>
              <div className="mini-stat">
                <span className="mini-label"><DollarSign size={14} /> Total Paid</span>
                <strong className="mini-value">{formatCurrency(totalPaid)}</strong>
              </div>
              <div className="mini-stat">
                <span className="mini-label"><Percent size={14} /> Interest Rate</span>
                <strong className="mini-value">{loan.interestRate}%</strong>
              </div>
              <div className="mini-stat">
                <span className="mini-label"><Calendar size={14} /> Penalty Rate</span>
                <strong className="mini-value">{loan.penaltyRate}%</strong>
              </div>
            </SectionCard>

            <SectionCard title="Savings Linked to Loan">
              <div className="mini-stat">
                <span className="mini-label">Daily Savings Deduction</span>
                <strong className="mini-value">{formatCurrency(loan.savingsAmount)}</strong>
              </div>
              <div className="mini-stat">
                <span className="mini-label">Unpaid Shares</span>
                <strong className="mini-value">{formatCurrency(loan.unpaidShares)}</strong>
              </div>
              <div className="mini-stat">
                <span className="mini-label">Unpaid Savings</span>
                <strong className="mini-value">{formatCurrency(loan.unpaidSavings)}</strong>
              </div>
              <div className="mini-stat">
                <span className="mini-label">Multiplier Redirect</span>
                <strong className="mini-value">{formatCurrency(loan.unpaidSavings)}</strong>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "payments" && (
          <SectionCard title="Payment Breakdown" description="All payments applied to this loan.">
            {loan.paymentBreakdowns.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead className="table-head">
                    <tr>
                      <th>Date</th>
                      <th>Receipt</th>
                      <th>Total Paid</th>
                      <th>→ Loan</th>
                      <th>→ Savings</th>
                      <th>→ Rounding</th>
                      <th>Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.paymentBreakdowns.map((payment: PaymentBreakdownRecord) => (
                      <tr className="table-row" key={payment.id}>
                        <td>{formatDate(payment.paymentDate)}</td>
                        <td>{payment.receiptNumber || "—"}</td>
                        <td><strong>{formatCurrency(payment.totalAmount)}</strong></td>
                        <td>{formatCurrency(payment.loanAmount)}</td>
                        <td>{formatCurrency(payment.savingsAmount)}</td>
                        <td>{formatCurrency(payment.roundedBucketAmount)}</td>
                        <td>
                          <span className="chip">{payment.sourceChannel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
                <p>No payments recorded for this loan yet.</p>
              </div>
            )}
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}