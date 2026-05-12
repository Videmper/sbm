"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getTransactionsSnapshot } from "@/lib/data";
import type { PagedResult, TransactionRecord, GetTransactionsParams } from "@/lib/types";
import { Search, ArrowDownLeft, ArrowUpRight, Filter, AlertCircle } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ page?: string; query?: string }>;
}

export default function TransactionsPage({ searchParams }: PageProps) {
  const [params, setParams] = useState<GetTransactionsParams>({ page: 1, limit: 25 });
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<PagedResult<TransactionRecord> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getTransactionsSnapshot({ ...params, query: searchQuery });
        if (!cancelled) setResult(data);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [params.page, params.limit, searchQuery]);

  useEffect(() => {
    (async () => {
      const sp = await searchParams;
      if (sp.query) setSearchQuery(sp.query);
      if (sp.page) params.page = Number(sp.page);
    })();
  }, [searchParams]);

  const handlePageChange = (newPage: number) => setParams((p) => ({ ...p, page: newPage }));

  const sourcePillClass = (source: string) => {
    const map: Record<string, string> = {
      mpesa: "status-pill-mpesa",
      legacy: "status-pill-inactive",
      live: "status-pill-live",
    };
    return map[source] || "status-pill-defaulted";
  };

  const typePillClass = (type: string) => {
    if (type === "deposit" || type === "payment") return "status-pill-active";
    if (type === "withdrawal") return "status-pill-defaulted";
    return "status-pill-review";
  };

  const sourceLabel = (source: string) => {
    const map: Record<string, string> = {
      mpesa: "M-PESA",
      legacy: "Legacy Sync",
      live: "Live",
    };
    return map[source] || source;
  };

  return (
    <AppShell
      title="Transactions"
      description="Unified transaction stream from M-PESA callbacks, legacy sync, and live collections."
      badge="Collections"
      currentPath="/transactions"
    >
      <SectionCard
        title="Transaction Stream"
        description="All payment activities across collection channels in one view."
      >
        <form style={{ marginBottom: 16, position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", zIndex: 1 }} />
          <input
            type="search"
            placeholder="Search by receipt number or payer phone..."
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
            Loading transactions…
          </div>
        )}

        {!loading && result && result.data.length === 0 && (
          <EmptyState
            title="No transactions found"
            description={searchQuery
              ? `No results for "${searchQuery}"`
              : "No transactions recorded yet. M-PESA callbacks will appear here once configured."}
          />
        )}

        {!loading && result && result.data.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((transaction) => (
                    <tr className="table-row" key={transaction.id}>
                      <td className="table-muted">{formatDateTime(transaction.recordedAt)}</td>
                      <td>
                        <span className={sourcePillClass(transaction.source)}>
                          {sourceLabel(transaction.source)}
                        </span>
                      </td>
                      <td>
                        <strong>{transaction.clientName}</strong>
                      </td>
                      <td>
                        <span style={{ color: transaction.type === "withdrawal" || transaction.type === "reversal" ? "var(--sbc-rose)" : "var(--text-primary)" }}>
                          {transaction.type === "withdrawal" || transaction.type === "reversal" ? "-" : "+"}
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td>
                        <span className={`chip ${typePillClass(transaction.type)}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className="table-muted">{transaction.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <span className="table-muted">
                Showing {result.data.length} of {result.total} transactions (page {result.page} of {result.totalPages})
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