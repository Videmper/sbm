"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { getLoansSnapshot } from "@/lib/data";
import type { PagedResult, LoanRecord, GetLoansParams } from "@/lib/types";
import { Plus, Search, TrendingUp, AlertCircle } from "lucide-react";

const LOAN_CATEGORIES = ["All", "Business", "Agriculture", "Education", "Emergency", "Other"] as const;
const LOAN_STATUSES = ["All", "pending", "approved", "active", "completed", "defaulted", "rejected"] as const;

interface PageProps {
  searchParams: Promise<{ page?: string; query?: string; status?: string; category?: string }>;
}

function ProgressBar({ value, max, color = "emerald" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`, height: "100%",
          background: color === "emerald" ? "var(--gradient-emerald)" : "var(--gradient-amber)",
          borderRadius: 999, transition: "width 0.4s ease",
        }}
      />
    </div>
  );
}

export default function LoansPage({ searchParams }: PageProps) {
  const router = useRouter();
  const [params, setParams] = useState<GetLoansParams>({ page: 1, limit: 20 });
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<PagedResult<LoanRecord> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getLoansSnapshot({ ...params, query: searchQuery });
        if (!cancelled) setResult(data);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [params.page, params.limit, params.status, params.category, searchQuery]);

  useEffect(() => {
    (async () => {
      const sp = await searchParams;
      const changed: Partial<GetLoansParams> = {};
      if (sp.query) { setSearchQuery(sp.query); changed.query = sp.query; }
      if (sp.status) changed.status = sp.status;
      if (sp.category) changed.category = sp.category;
      if (sp.page) changed.page = Number(sp.page);
      if (Object.keys(changed).length) setParams((p) => ({ ...p, ...changed }));
    })();
  }, [searchParams]);

  const handleStatusFilter = (status: string) => {
    setParams((p) => ({ ...p, status: status === "All" ? undefined : status, page: 1 }));
  };

  const handleCategoryFilter = (category: string) => {
    setParams((p) => ({ ...p, category: category === "All" ? undefined : category, page: 1 }));
  };

  const handlePageChange = (newPage: number) => setParams((p) => ({ ...p, page: newPage }));

  return (
    <AppShell
      title="Loan Portfolio"
      description="Active loans, balances computed from payment breakdowns, and risk indicators."
      badge="Loans"
      currentPath="/loans"
    >
      <SectionCard
        title="Loan Pipeline"
        description="Active loans, balances computed from payment breakdowns, and risk indicators."
        style={{ marginBottom: 22 }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="search"
              placeholder="Search by client or category..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); params.page = 1; }}
              style={{
                width: "100%", minHeight: 44, borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
                color: "var(--text)", padding: "0 14px 0 36px", fontSize: "0.9rem", outline: "none",
              }}
            />
          </div>
          <select
            value={params.status ?? "All"}
            onChange={(e) => handleStatusFilter(e.target.value)}
            style={{ minHeight: 44, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "var(--text)", padding: "0 12px", fontSize: "0.9rem", cursor: "pointer" }}
          >
            {LOAN_STATUSES.map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
          </select>
          <select
            value={params.category ?? "All"}
            onChange={(e) => handleCategoryFilter(e.target.value)}
            style={{ minHeight: 44, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "var(--text)", padding: "0 12px", fontSize: "0.9rem", cursor: "pointer" }}
          >
            {LOAN_CATEGORIES.map((c) => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
          </select>
          <button
            className="btn-primary"
            onClick={() => router.push("/loans/new")}
            style={{ whiteSpace: "nowrap" }}
          >
            <Plus size={16} style={{ marginRight: 4 }} /> New Loan
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading loans…</div>
        )}

        {!loading && result && result.data.length === 0 && (
          <EmptyState
            title="No loans found"
            description={searchQuery || params.status || params.category
              ? "Try adjusting your filters."
              : "No loans on the books yet."}
            icon={<AlertCircle size={48} style={{ opacity: 0.3 }} />}
          />
        )}

        {!loading && result && result.data.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Client</th>
                    <th>Category</th>
                    <th>Principal</th>
                    <th>Balance</th>
                    <th>Progress</th>
                    <th>Rate</th>
                    <th>Repayment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((loan) => {
                    const pct = loan.principal > 0 ? Math.round(((loan.principal - loan.balance) / loan.principal) * 100) : 0;
                    const progressColor = loan.status === "defaulted" ? "rose" : "emerald";
                    return (
                      <tr className="table-row" key={loan.id} style={{ cursor: "pointer" }}>
                        <td>
                          <strong>{loan.clientName}</strong>
                          <div className="table-muted">{loan.repaymentFrequency} • Due {formatDate(loan.dueDate)}</div>
                        </td>
                        <td>{loan.category}</td>
                        <td>{formatCurrency(loan.principal)}</td>
                        <td style={{ fontWeight: "bold", color: loan.balance > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {formatCurrency(loan.balance)}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="table-muted" style={{ minWidth: 36 }}>{pct}%</span>
                            <ProgressBar value={loan.principal - loan.balance} max={loan.principal} color={progressColor} />
                          </div>
                        </td>
                        <td>{loan.interestRate}%</td>
                        <td>{loan.repaymentFrequency}</td>
                        <td>
                          <span className={`status-pill status-pill-${loan.status}`}>{loan.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <span className="table-muted">
                Showing {result.data.length} of {result.total} loans (page {result.page} of {result.totalPages})
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn-secondary"
                  disabled={!result.hasPrev}
                  onClick={() => handlePageChange(result.page - 1)}
                  style={{ minHeight: 38, padding: "0 14px", borderRadius: 10 }}
                >
                  ← Previous
                </button>
                <button
                  className="btn-primary"
                  disabled={!result.hasNext}
                  onClick={() => handlePageChange(result.page + 1)}
                  style={{ minHeight: 38, padding: "0 14px", borderRadius: 10 }}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </AppShell>
  );
}