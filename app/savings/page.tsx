"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getSavingsSnapshot } from "@/lib/data";
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
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.page, params.limit, searchQuery]);

  useEffect(() => {
    (async () => {
      const sp = await searchParams;
      if (sp.q) setSearchQuery(sp.q);
      if (sp.page) params.page = Number(sp.page);
    })();
  }, [searchParams]);

  const totals = result?.data.reduce(
    (sum, item) => {
      sum.mandatory += item.mandatory;
      sum.shares += item.mandatoryShares;
      sum.multiplier += item.multiplier;
      sum.withdrawable += item.withdrawable;
      return sum;
    },
    { mandatory: 0, shares: 0, multiplier: 0, withdrawable: 0 },
  ) ?? { mandatory: 0, shares: 0, multiplier: 0, withdrawable: 0 };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    params.page = 1;
  };

  return (
    <AppShell
      title="Savings Portfolio"
      description="Mandatory savings, shares, multiplier balances, and approved withdrawable amounts."
      badge="Portfolio logic"
      currentPath="/savings"
    >
      <div className="metric-grid">
        <StatCard label="Mandatory Savings" value={formatCurrency(totals.mandatory)} helper="Threshold-facing member savings" tone="emerald" />
        <StatCard label="Mandatory Shares" value={formatCurrency(totals.shares)} helper="Membership shares currently held" tone="amber" />
        <StatCard label="Multiplier" value={formatCurrency(totals.multiplier)} helper="Net multiplier still retained" tone="blue" />
        <StatCard label="Withdrawable" value={formatCurrency(totals.withdrawable)} helper="Approved member-accessible funds" tone="rose" />
      </div>

      <SectionCard
        title="Member Balances"
        description="The Supabase schema includes dedicated tables for transfers, purpose-pool allocations, and historical overrides."
      >
        <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
          <input
            type="search"
            placeholder="Search by member name or number..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); params.page = 1; }}
            style={{
              width: "100%",
              minHeight: 44,
              borderRadius: 12,
              border: "1px solid rgba(239,248,255,0.1)",
              background: "rgba(239,248,255,0.05)",
              color: "var(--text)",
              padding: "0 16px",
              fontSize: "0.95rem",
            }}
          />
        </form>

        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>
            Loading savings…
          </div>
        )}

        {!loading && result && result.data.length === 0 && (
          <EmptyState
            title="No savings records found"
            description={searchQuery ? `No results for "${searchQuery}"` : "No savings records available."}
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
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((item) => (
                    <tr className="table-row" key={item.id}>
                      <td>{item.clientName}</td>
                      <td>{formatCurrency(item.mandatory)}</td>
                      <td>{formatCurrency(item.mandatoryShares)}</td>
                      <td>{formatCurrency(item.multiplier)}</td>
                      <td>{formatCurrency(item.withdrawable)}</td>
                      <td>{formatDateTime(item.updatedAt)}</td>
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
                     onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                    style={{ minHeight: 38, padding: "0 14px", borderRadius: 10, cursor: result.hasPrev ? "pointer" : "default" }}
                  >
                    Previous
                  </button>
                  <button
                    className="btn-primary"
                    disabled={!result.hasNext}
                     onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                    style={{ minHeight: 38, padding: "0 14px", borderRadius: 10, cursor: result.hasNext ? "pointer" : "default" }}
                  >
                    Next
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