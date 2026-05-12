"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { Calculator, AlertTriangle, ArrowLeft, DollarSign, Percent, Calendar, ArrowDown } from "lucide-react";
import type { LoanSimulatorInput, LoanSimulatorOutput, AmortizationEntry } from "@/lib/types";

function calculateLoan(input: LoanSimulatorInput): LoanSimulatorOutput {
  const { principal, interestRate, termWeeks, repaymentFrequency, processingFee = 0, insuranceFee = 0, savingsDeduction = 0 } = input;

  const periodsPerYear = repaymentFrequency === "daily" ? 365 : repaymentFrequency === "weekly" ? 52 : 12;
  const totalPeriods = Math.round(termWeeks * (periodsPerYear / 52));
  const periodicRate = interestRate / periodsPerYear;

  const periodicPayment = principal > 0 && periodicRate > 0
    ? (principal * periodicRate) / (1 - Math.pow(1 + periodicRate, -totalPeriods))
    : principal / Math.max(totalPeriods, 1);

  const totalInterest = (periodicPayment * totalPeriods) - principal;
  const totalDeductions = processingFee + insuranceFee;
  const totalRepayment = principal + totalInterest + totalDeductions;
  const netDisbursed = principal - totalDeductions + savingsDeduction;

  const schedule: AmortizationEntry[] = [];
  let remainingBalance = principal;
  const startDate = new Date();

  for (let i = 1; i <= totalPeriods; i++) {
    const interestPayment = remainingBalance * periodicRate;
    const principalPayment = periodicPayment - interestPayment;
    const endBalance = Math.max(remainingBalance - principalPayment, 0);

    const date = new Date(startDate);
    if (repaymentFrequency === "daily") date.setDate(date.getDate() + i);
    else if (repaymentFrequency === "weekly") date.setDate(date.getDate() + i * 7);
    else date.setMonth(date.getMonth() + i);

    schedule.push({
      week: i,
      date: date.toISOString().split("T")[0],
      beginningBalance: remainingBalance,
      principalPayment,
      interestPayment,
      totalPayment: periodicPayment,
      endingBalance: endBalance,
    });

    remainingBalance = endBalance;
  }

  return {
    principal,
    totalInterest,
    processingFee,
    insuranceFee,
    totalDeductions,
    totalRepayment,
    netDisbursed,
    weeklyPayment: repaymentFrequency === "weekly" ? periodicPayment : periodicPayment * (52 / periodsPerYear),
    dailyPayment: repaymentFrequency === "daily" ? periodicPayment : periodicPayment / (periodsPerYear / (repaymentFrequency === "weekly" ? 7 : 30)),
    monthlyPayment: repaymentFrequency === "monthly" ? periodicPayment : periodicPayment * (12 / periodsPerYear),
    paymentSchedule: schedule,
  };
}

export default function LoanSimulatorPage() {
  const router = useRouter();
  const [input, setInput] = useState<LoanSimulatorInput>({
    principal: 50000,
    interestRate: 0.03,
    termWeeks: 12,
    repaymentFrequency: "weekly",
    processingFee: 1000,
    insuranceFee: 500,
    savingsDeduction: 0,
  });
  const [result, setResult] = useState<LoanSimulatorOutput | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  const handleCalculate = () => {
    if (input.principal <= 0 || input.interestRate < 0 || input.termWeeks <= 0) {
      alert("Please enter valid loan parameters.");
      return;
    }
    const output = calculateLoan(input);
    setResult(output);
    setShowSchedule(false);
  };

  const handleReset = () => {
    setInput({ principal: 0, interestRate: 0, termWeeks: 12, repaymentFrequency: "weekly", processingFee: 0, insuranceFee: 0, savingsDeduction: 0 });
    setResult(null);
    setShowSchedule(false);
  };

  const handleApply = () => {
    if (!result) return;
    router.push("/loans/new");
  };

  return (
    <AppShell title="Loan Simulator" description="Model interest rates, repayment periods, and total costs before committing." badge="Tools" currentPath="/loan-simulator">
      <button className="btn-secondary" onClick={() => router.push("/dashboard")} style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 8 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="two-up">
        <SectionCard title="Loan Parameters">
          <div className="loan-simulator">
            <div className="sim-input-group">
              <label>Loan Amount (KES)</label>
              <input type="number" value={input.principal} onChange={(e) => setInput({ ...input, principal: Number(e.target.value) })} placeholder="Enter loan amount" min={0} step={1000} />
            </div>

            <div className="sim-input-group">
              <label>Annual Interest Rate (%)</label>
              <input type="number" value={input.interestRate * 100} onChange={(e) => setInput({ ...input, interestRate: Number(e.target.value) / 100 })} placeholder="e.g. 3 for 3%" min={0} step={0.1} />
            </div>

            <div className="sim-input-group">
              <label>Repayment Frequency</label>
              <select value={input.repaymentFrequency} onChange={(e) => setInput({ ...input, repaymentFrequency: e.target.value as any })}>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="sim-input-group">
              <label>Term (Weeks)</label>
              <input type="number" value={input.termWeeks} onChange={(e) => setInput({ ...input, termWeeks: Number(e.target.value) })} placeholder="e.g. 12" min={1} />
            </div>

            <div className="sim-input-group">
              <label>Processing Fee (KES)</label>
              <input type="number" value={input.processingFee} onChange={(e) => setInput({ ...input, processingFee: Number(e.target.value) })} placeholder="e.g. 1000" min={0} />
            </div>

            <div className="sim-input-group">
              <label>Insurance Fee (KES)</label>
              <input type="number" value={input.insuranceFee} onChange={(e) => setInput({ ...input, insuranceFee: Number(e.target.value) })} placeholder="e.g. 500" min={0} />
            </div>

            <div className="sim-input-group">
              <label>Savings Deduction (KES/period)</label>
              <input type="number" value={input.savingsDeduction} onChange={(e) => setInput({ ...input, savingsDeduction: Number(e.target.value) })} placeholder="Optional" min={0} />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button className="btn-primary" onClick={handleCalculate} style={{ flex: 1 }}>
                <Calculator size={16} style={{ marginRight: 8 }} /> Calculate
              </button>
              <button className="btn-secondary" onClick={handleReset}>Reset</button>
            </div>
          </div>
        </SectionCard>

        {result && (
          <SectionCard title="Results Summary">
            <div className="sim-result-card">
              <div className="sim-result-row">
                <span className="sim-result-label"><DollarSign size={14} /> Principal</span>
                <span className="sim-result-value">KES {result.principal.toLocaleString()}</span>
              </div>
              <div className="sim-result-row">
                <span className="sim-result-label"><Percent size={14} /> Total Interest</span>
                <span className="sim-result-value">KES {result.totalInterest.toLocaleString()}</span>
              </div>
              <div className="sim-result-row">
                <span className="sim-result-label"><Calendar size={14} /> Processing Fee</span>
                <span className="sim-result-value">KES {result.processingFee.toLocaleString()}</span>
              </div>
              <div className="sim-result-row">
                <span className="sim-result-label"><AlertTriangle size={14} /> Insurance Fee</span>
                <span className="sim-result-value">KES {result.insuranceFee.toLocaleString()}</span>
              </div>
              <div className="sim-result-row" style={{ borderTop: "2px solid var(--line-strong)", marginTop: 4, paddingTop: 12 }}>
                <span className="sim-result-label" style={{ fontWeight: 700 }}><DollarSign size={16} /> Total Repayment</span>
                <span className="sim-result-value" style={{ color: "var(--sbc-emerald)" }}>KES {result.totalRepayment.toLocaleString()}</span>
              </div>
              <div className="sim-result-row">
                <span className="sim-result-label"><ArrowDown size={14} /> Net Disbursed</span>
                <span className="sim-result-value">KES {result.netDisbursed.toLocaleString()}</span>
              </div>
            </div>

            <div className="sim-result-card" style={{ marginTop: 12 }}>
              <div className="sim-result-row">
                <span className="sim-result-label">Weekly Payment</span>
                <span className="sim-result-value">KES {result.weeklyPayment.toLocaleString()}/wk</span>
              </div>
              <div className="sim-result-row">
                <span className="sim-result-label">Daily Payment</span>
                <span className="sim-result-value">KES {result.dailyPayment.toLocaleString()}/day</span>
              </div>
              <div className="sim-result-row">
                <span className="sim-result-label">Monthly Payment</span>
                <span className="sim-result-value">KES {result.monthlyPayment.toLocaleString()}/mo</span>
              </div>
            </div>

            <button className="btn-secondary" onClick={() => setShowSchedule(!showSchedule)} style={{ width: "100%", marginTop: 8 }}>
              {showSchedule ? "Hide Amortization Schedule" : "View Amortization Schedule"}
            </button>

            <button className="btn-primary" onClick={handleApply} style={{ width: "100%", marginTop: 12 }}>
              Apply for this Loan →
            </button>
          </SectionCard>
        )}

        {showSchedule && result && (
          <SectionCard title="Amortization Schedule" style={{ marginTop: 22 }}>
            <div className="table-wrap">
              <table className="sim-amort-table">
                <thead className="table-head">
                  <tr><th>#</th><th>Date</th><th>Beginning</th><th>Principal</th><th>Interest</th><th>Payment</th><th>Ending</th></tr>
                </thead>
                <tbody>
                  {result.paymentSchedule.map((entry: AmortizationEntry) => (
                    <tr key={entry.week}>
                      <td>{entry.week}</td>
                      <td className="table-muted">{entry.date}</td>
                      <td>{entry.beginningBalance.toLocaleString()}</td>
                      <td>{entry.principalPayment.toLocaleString()}</td>
                      <td>{entry.interestPayment.toLocaleString()}</td>
                      <td><strong>{entry.totalPayment.toLocaleString()}</strong></td>
                      <td>{entry.endingBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {!result && (
          <SectionCard title="How to Use" style={{ alignSelf: "start" }}>
            <ul className="bullet-list">
              <li>Enter the <strong>loan amount</strong> the member is requesting.</li>
              <li>Set the <strong>annual interest rate</strong> (e.g. 3% = enter 3).</li>
              <li>Choose <strong>repayment frequency</strong>: weekly, daily, or monthly.</li>
              <li>Enter the <strong>term</strong> in weeks.</li>
              <li>Add optional <strong>processing and insurance fees</strong>.</li>
              <li>Click <strong>Calculate</strong> to see the full breakdown.</li>
            </ul>
            <div style={{ marginTop: 16, padding: 12, background: "rgba(26,115,232,0.06)", borderRadius: 12, border: "1px solid rgba(26,115,232,0.12)" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                <strong>Formula:</strong> Standard amortization (PMT) with compounding based on frequency. Each payment is split into principal + interest components.
              </p>
            </div>
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}