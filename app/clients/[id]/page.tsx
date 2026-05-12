"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { getClientById, getLoansSnapshot, getSavingsSnapshot, getTransactionsSnapshot } from "@/lib/data";
import { ArrowLeft, Phone, Mail, Building, MapPin, Users, CreditCard, Wallet as WalletIcon, Award, FileText, PhoneCall } from "lucide-react";
import type { ClientRecord, LoanRecord, SavingsRecord, TransactionRecord, GuarantorRecord, CollateralRecord } from "@/lib/types";
import type { PagedResult } from "@/lib/types";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [savings, setSavings] = useState<SavingsRecord | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    (async () => {
      const resolved = await params;
      const { id } = resolved;
      if (!id) {
        router.push("/clients");
        return;
      }

      const [clientData, loansData, savingsData, txData] = await Promise.all([
        getClientById(id),
        getLoansSnapshot({ clientId: id, page: 1, limit: 20 }),
        getSavingsSnapshot({ page: 1, limit: 100 }),
        getTransactionsSnapshot({ page: 1, limit: 10 }),
      ]);

      setClient(clientData);
      setLoans(loansData?.data ?? []);
      const clientSavings = savingsData?.data.find((s) => s.clientId === id) ?? null;
      setSavings(clientSavings ?? {
        id, clientId: id, clientName: clientData?.fullName ?? "",
        mandatory: 0, mandatoryShares: 0, multiplier: 0, withdrawable: 0, total: 0, updatedAt: new Date().toISOString(),
      });
      setTransactions(txData?.data ?? []);
      setLoading(false);
    })();
  }, [params, router]);

  if (loading) {
    return (
      <AppShell title="Client" currentPath="/clients">
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading client details…</div>
      </AppShell>
    );
  }

  if (!client) {
    return (
      <AppShell title="Client" currentPath="/clients">
        <div style={{ textAlign: "center", padding: 60 }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>Client not found.</p>
          <button className="btn-secondary" onClick={() => router.push("/clients")}>Back to Members</button>
        </div>
      </AppShell>
    );
  }

  const totalLoanExposure = loans.reduce((sum, l) => sum + l.principal, 0);
  const totalOutstanding = loans.filter(l => ["active", "approved"].includes(l.status)).reduce((sum, l) => sum + l.balance, 0);

  return (
    <AppShell title={client.fullName} description="Member profile and financial overview." badge="Member" currentPath="/clients">
      <button className="btn-secondary" onClick={() => router.push("/clients")} style={{ marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 8 }}>
        <ArrowLeft size={16} /> Back to Members
      </button>

      {/* Profile Header */}
      <SectionCard style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "linear-gradient(135deg, rgba(26,115,232,0.2), rgba(24,178,126,0.15))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", flexShrink: 0,
          }}>
            {client.fullName.charAt(0)}{client.fullName.split(" ")[1]?.charAt(0) ?? ""}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ marginBottom: 4 }}>{client.fullName}</h2>
            <span className="chip" style={{ marginBottom: 8 }}>{client.memberNo}</span>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
              <span className="table-muted" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <PhoneCall size={14} /> {client.phone}
              </span>
              {client.businessName && (
                <span className="table-muted" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Building size={14} /> {client.businessName}
                </span>
              )}
              <span className="table-muted" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={14} /> {client.county}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className={`status-pill status-pill-${client.status}`}>{client.status}</span>
            {client.savingsOnly && <span className="chip">Savings Only</span>}
          </div>
        </div>
      </SectionCard>

      {/* Metrics */}
      <div className="metric-grid">
        <StatCard label="Total Loan Exposure" value={formatCurrency(totalLoanExposure)} helper="All loans across cycles" tone="blue" />
        <StatCard label="Outstanding Balance" value={formatCurrency(totalOutstanding)} helper="Active + approved loans" tone="amber" />
        <StatCard label="Savings (Mandatory)" value={formatCurrency(savings?.mandatory ?? 0)} helper="Mandatory savings balance" tone="emerald" />
        <StatCard label="Savings (Withdrawable)" value={formatCurrency(savings?.withdrawable ?? 0)} helper="Available for withdrawal" tone="rose" />
      </div>

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 4, marginTop: 24, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 0 }}>
        {[
          { key: "overview", label: "Overview" },
          { key: "loans", label: `Loans (${loans.length})` },
          { key: "savings", label: "Savings" },
          { key: "transactions", label: "Transactions" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 16px", border: "none", background: "transparent",
              color: activeTab === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--sbc-primary)" : "2px solid transparent",
              cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, fontFamily: "var(--font-body)",
              transition: "all 150ms ease",
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
            <SectionCard title="Contact Information">
              <div className="mini-stat">
                <span className="mini-label"><Phone size={14} /> Phone</span>
                <strong className="mini-value">{client.phone}</strong>
              </div>
              {client.email && (
                <div className="mini-stat">
                  <span className="mini-label"><Mail size={14} /> Email</span>
                  <strong className="mini-value">{client.email}</strong>
                </div>
              )}
              {client.businessName && (
                <div className="mini-stat">
                  <span className="mini-label"><Building size={14} /> Business</span>
                  <strong className="mini-value">{client.businessName}</strong>
                </div>
              )}
              <div className="mini-stat">
                <span className="mini-label"><Award size={14} /> Member Since</span>
                <strong className="mini-value">{formatDate(client.joinedAt)}</strong>
              </div>
            </SectionCard>

            <SectionCard title="Loan Summary">
              {loans.length > 0 ? (
                loans.map((loan) => (
                  <div key={loan.id} className="mini-stat" style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="mini-label">{loan.category} — {formatDate(loan.dueDate)}</span>
                      <span className={`status-pill status-pill-${loan.status}`} style={{ fontSize: "0.7rem" }}>{loan.status}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <strong className="mini-value" style={{ fontSize: "1rem" }}>{formatCurrency(loan.principal)}</strong>
                      <span style={{ color: loan.balance > 0 ? "var(--sbc-amber)" : "var(--text-muted)", fontSize: "0.85rem" }}>
                        Balance: {formatCurrency(loan.balance)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)" }}>
                  <CreditCard size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>No loans on record</p>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {activeTab === "loans" && (
          <SectionCard title="Loan History" description="All loans associated with this member.">
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Category</th>
                    <th>Principal</th>
                    <th>Balance</th>
                    <th>Rate</th>
                    <th>Repayment</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr className="table-row" key={loan.id}>
                      <td>{loan.category}</td>
                      <td><strong>{formatCurrency(loan.principal)}</strong></td>
                      <td style={{ color: loan.balance > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>{formatCurrency(loan.balance)}</td>
                      <td>{loan.interestRate}%</td>
                      <td>{loan.repaymentFrequency}</td>
                      <td>{formatDate(loan.dueDate)}</td>
                      <td><span className={`status-pill status-pill-${loan.status}`}>{loan.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loans.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
                <p>No loans found for this member.</p>
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === "savings" && (
          <SectionCard title="Savings Portfolio" description="Multi-bucket savings breakdown.">
            <div className="metric-grid" style={{ marginTop: 0 }}>
              <StatCard label="Mandatory Savings" value={formatCurrency(savings?.mandatory ?? 0)} helper="Mandatory contributions" tone="emerald" />
              <StatCard label="Mandatory Shares" value={formatCurrency(savings?.mandatoryShares ?? 0)} helper="Membership shares" tone="blue" />
              <StatCard label="Multiplier" value={formatCurrency(savings?.multiplier ?? 0)} helper="Multiplier balance" tone="amber" />
              <StatCard label="Withdrawable" value={formatCurrency(savings?.withdrawable ?? 0)} helper="Approved for withdrawal" tone="rose" />
            </div>
          </SectionCard>
        )}

        {activeTab === "transactions" && (
          <SectionCard title="Recent Transactions" description="Payment and transaction history.">
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr className="table-row" key={tx.id}>
                      <td>{formatDateTime(tx.recordedAt)}</td>
                      <td><span className={`chip ${tx.type === "deposit" ? "" : ""}`}>{tx.type}</span></td>
                      <td style={{ color: tx.type === "withdrawal" ? "var(--sbc-rose)" : "var(--text-primary)" }}>
                        {tx.type === "withdrawal" ? "-" : "+"}{formatCurrency(tx.amount)}
                      </td>
                      <td>{tx.reference}</td>
                      <td>{tx.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactions.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
                <p>No transactions found for this member.</p>
              </div>
            )}
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}