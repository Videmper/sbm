"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { getLoanById, getLoansSnapshot } from "@/lib/data";
import type { LoanRecord, PaymentBreakdownRecord } from "@/lib/types";

function ProgressBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  return (
    <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: paid >= total ? "linear-gradient(90deg, #18b27e, #3ed7b0)" : "linear-gradient(90deg, #4ba3ff, #7ab8ff)",
          borderRadius: 999,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const loanId = String(params.id);

  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getLoanById(loanId);
        if (!cancelled) {
          setLoan(data);
          if (!data) setError("Loan not found");
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? "Failed to load loan");
          setLoan(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loanId]);

  if (loading) {
    return (
      <AppShell title="Loan Detail" description="Loading..." badge="Loan" currentPath="/loans">
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading loan…</div>
      </AppShell>
    );
  }

  if (error || !loan) {
    return (
      <AppShell title="Loan Detail" description={error ?? "Not found"} badge="Loan" currentPath="/loans">
        <SectionCard title="Error">
          <p className="table-muted">{error ?? "Loan not found."}</p>
          <button
            className="btn-secondary"
            onClick={() => router.push("/loans")}
            style={{ marginTop: 16, minHeight: 38, padding: "0 16px", borderRadius: 10, cursor: "pointer" }}
          >
            Back to Loans
          </button>
        </SectionCard>
      </AppShell>
    );
  }

  const totalPaid = loan.paymentBreakdowns.reduce((sum, b) => sum + b.loanAmount, 0);
  const percentPaid = loan.principal > 0 ? Math.round((totalPaid / loan.principal) * 100) : 0;

  return (
    <AppShell
      title={`Loan for ${loan.clientName}`}
      description={`${loan.category} • ${loan.status}`}
      badge="Loan Detail"
      currentPath="/loans"
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.8rem" }}>
            {formatCurrency(loan.principal)}
          </h2>
          <p className="table-muted" style={{ margin: "4px 0 0" }}>
            {loan.category} • {loan.repaymentFrequency}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={`status-pill status-pill-${loan.status}`}>{loan.status}</span>
          <span className={`status-pill status-pill-${loan.workflowStatus}`}>{loan.workflowStatus}</span>
        </div>
      </div>

      {/* Repayment Progress */}
      <div className="stat-card tone-blue" style={{ marginBottom: 20 }}>
        <span className="stat-label">Repayment Progress</span>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <strong>{percentPaid}%</strong>
            <span className="table-muted">
              {formatCurrency(totalPaid)} of {formatCurrency(loan.principal)}
            </span>
          </div>
          <ProgressBar paid={totalPaid} total={loan.principal} />
        </div>
        {loan.balance > 0 && (
          <p className="stat-helper" style={{ marginTop: 10 }}>
            Remaining balance: <strong>{formatCurrency(loan.balance)}</strong>
          </p>
        )}
      </div>

      {/* Key Metrics */}
      <div className="metric-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Balance" value={formatCurrency(loan.balance)} helper="Remaining principal" tone="blue" />
        <StatCard label="Due Date" value={formatDate(loan.dueDate)} helper="Repayment deadline" tone="amber" />
        <StatCard label="Interest Rate" value={`${(loan.interestRate * 100).toFixed(1)}%`} helper="Annual rate" tone="emerald" />
        <StatCard label="Payments" value={String(loan.paymentBreakdowns.length)} helper="Total payments received" tone="rose" />
        {loan.termWeeks > 0 && (
          <StatCard label="Term" value={`${loan.termWeeks} weeks`} helper="Loan period" tone="blue" />
        )}
        {loan.penaltyRate > 0 && (
          <StatCard label="Penalty" value={`${(loan.penaltyRate * 100).toFixed(1)}%`} helper="Overdue penalty rate" tone="rose" />
        )}
      </div>

      {/* Payment Breakdown */}
      <SectionCard
        title="Payment Breakdown"
        description={`${loan.paymentBreakdowns.length} payment(s) recorded for this loan.`}
      >
        {loan.paymentBreakdowns.length === 0 ? (
          <EmptyState title="No payments yet" description="This loan has no recorded payments." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr>
                  <th>Date</th>
                  <th>Receipt</th>
                  <th>Loan Amount</th>
                  <th>Savings</th>
                  <th>Rounded</th>
                  <th>Total</th>
                  <th>Channel</th>
                </tr>
              </thead>
              <tbody>
                {loan.paymentBreakdowns.map((p: PaymentBreakdownRecord) => (
                  <tr className="table-row" key={p.id}>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td>{p.receiptNumber || "—"}</td>
                    <td>{formatCurrency(p.loanAmount)}</td>
                    <td>{formatCurrency(p.savingsAmount)}</td>
                    <td>{formatCurrency(p.roundedBucketAmount)}</td>
                    <td>{formatCurrency(p.totalAmount)}</td>
                    <td>
                      <span className="chip">{p.sourceChannel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Loan Details Summary */}
      <SectionCard title="Loan Details" style={{ marginTop: 22 }}>
        <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {loan.clientId && <DetailRow label="Client ID" value={loan.clientId} />}
          <DetailRow label="Principal" value={formatCurrency(loan.principal)} />
          <DetailRow label="Net Disbursed" value={formatCurrency(loan.netDisbursed)} />
          <DetailRow label="Total Repayment" value={formatCurrency(loan.totalRepayment)} />
          <DetailRow label="Processing Fee" value={formatCurrency(loan.processingFee)} />
          <DetailRow label="Insurance Fee" value={formatCurrency(loan.insuranceFee)} />
          <DetailRow label="Interest Amount" value={formatCurrency(loan.interestAmount)} />
          <DetailRow label="Funds Transfer Fee" value={formatCurrency(loan.fundsTransferFee)} />
          <DetailRow label="Unpaid Shares" value={formatCurrency(loan.unpaidShares)} />
          <DetailRow label="Unpaid Savings" value={formatCurrency(loan.unpaidSavings)} />
          <DetailRow label="Loan Period" value={`${loan.loanPeriodDays} days`} />
          <DetailRow label="Weekly Contribution" value={formatCurrency(loan.dailyContribution)} />
          <DetailRow label="Collateral Fee" value={formatCurrency(loan.collateralJointFee)} />
          {loan.approvedAt && <DetailRow label="Approved At" value={formatDate(loan.approvedAt)} />}
          {loan.submittedAt && <DetailRow label="Submitted" value={formatDateTime(loan.submittedAt)} />}
        </div>
      </SectionCard>
    </AppShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--line)" }}>
      <div className="table-muted" style={{ fontSize: 0.82, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}