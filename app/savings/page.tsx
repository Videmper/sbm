"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getSavingsSnapshot } from "@/lib/data";
import { Search, DollarSign, Wallet, TrendingUp, PiggyBank } from "lucide-react";
import type { PagedResult, SavingsRecord, GetSavingsParams } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default function SavingsPage({ searchParams }: PageProps) {
  const [params, setParams] = useState<GetSavingsParams>({ page: 1, limit: 50 });
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<PagedResult<SavingsRecord> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getSavingsSnapshot({ ...params, searchQuery });
        if (!cancelled) setResult(data);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [params.page, params.limit, searchQuery]);

  useEffect(() => {
    (async () => {
      const sp = await searchParams;
      if (sp.q) setSearchQuery(sp.q);
      if (sp.page) setParams((p) => ({ ...p, page: Number(sp.page) }));
    })();
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    params.page = 1;
  };

  const handlePageChange = (newPage: number) => setParams((p) => ({ ...p, page: newPage }));

  const totals = result?.data.reduce(
    (sum, item) => {
      sum.mandatory += item.mandatory;
      sum.shares += item.mandatoryShares;
      sum.multiplier += item.multiplier;
      sum.withdrawable += item.withdrawable;
      sum.total += item.total;
      return sum;
    },
    { mandatory: 0, shares: 0, multiplier: 0, withdrawable: 0, total: 0 },
  ) ?? { mandatory: 0, shares: 0, multiplier: 0, withdrawable: 0, total: 0 };

  return (
    <AppShell
      title="Savings Portfolio"
      description="Multi-bucket member savings: mandatory, shares, multiplier, and withdrawable."
      badge="Savings"
      currentPath="/savings"
    >
      <div className="metric-grid">
        <StatCard label="Total Savings" value={formatCurrency(totals.total)} helper="All member savings combined" tone="emerald" />
        <StatCard label="Mandatory Savings" value={formatCurrency(totals.mandatory)} helper="Threshold-facing member savings" tone="blue" />
        <StatCard label="Membership Shares" value={formatCurrency(totals.shares)} helper="Member equity shares held" tone="amber" />
        <StatCard label="Withdrawable" value={formatCurrency(totals.withdrawable)} helper="Approved for member withdrawal" tone="rose" />
      </div>

      <SectionCard
        title="Member Balances"
        description="Savings breakdown per member across all buckets."
      >
        <form onSubmit={handleSearch} style={{ marginBottom: 16, position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", zIndex: 1 }} />
          <input
            type="search"
            placeholder="Search by member name or number..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); params.page = 1; }}
            style={{
              width: "100%", minHeight: 44, borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)", color: "var(--text)",
              padding: "0 16px 0 40px", fontSize: "0.95rem", outline: "none",
            }}
          />
        </form>

        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            Loading savings…
          </div>
        )}

        {!loading && result && result.data.length === 0 && (
          <EmptyState
            title="No savings records found"
            description={searchQuery
              ? `No results for "${searchQuery}"`
              : "No savings records available yet."}
          />
        )}

        {!loading && result && result.data.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Member</th>
                    <th>Mandatory</th>
                    <th>Shares</th>
                    <th>Multiplier</th>
                    <th>Withdrawable</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((item) => (
                    <tr className="table-row" key={item.id}>
                      <td><strong>{item.clientName}</strong></td>
                      <td>{formatCurrency(item.mandatory)}</td>
                      <td>{formatCurrency(item.mandatoryShares)}</td>
                      <td>{formatCurrency(item.multiplier)}</td>
                      <td>{formatCurrency(item.withdrawable)}</td>
                      <td><strong>{formatCurrency(item.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                <span className="table-muted">
                  Showing {result.data.length} of {result.total} members (page {result.page} of {result.totalPages})
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
            )}
          </>
        )}
      </SectionCard>
    </AppShell>
  );
}