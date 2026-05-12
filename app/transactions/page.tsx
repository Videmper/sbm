"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getTransactionsSnapshot } from "@/lib/data";
import type { PagedResult, TransactionRecord, GetTransactionsParams } from "@/lib/types";

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
      if (sp.query) setSearchQuery(sp.query);
      if (sp.page) params.page = Number(sp.page);
    })();
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    params.page = 1;
  };

  const handlePageChange = (newPage: number) => {
    params.page = newPage;
  };

  const sourcePillClass = (source: string) => {
    const map: Record<string, string> = {
      mpesa: "status-pill-mpesa",
      legacy: "status-pill-inactive",
      live: "status-pill-live",
    };
    return map[source] || "status-pill-defaulted";
  };

  return (
    <AppShell
      title="Transactions"
      description="Unified visibility for live collections, legacy imports, and M-PESA receipts."
      badge="Collections"
      currentPath="/transactions"
    >
      <SectionCard
        title="Collection Stream"
        description="This page is positioned to replace the old mixed transaction screen with one clean timeline."
      >
        <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
          <input
            type="search"
            placeholder="Search by receipt number or payer phone..."
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
            Loading transactions…
          </div>
        )}

        {!loading && result && result.data.length === 0 && (
          <EmptyState
            title="No transactions found"
            description={searchQuery ? `No results for "${searchQuery}"` : "No transactions recorded yet."}
          />
        )}

        {!loading && result && result.data.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Source</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Reference</th>
                    <th>Method</th>
                    <th>Recorded</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((transaction) => (
                    <tr className="table-row" key={transaction.id}>
                      <td>
                        <span className={sourcePillClass(transaction.source)}>
                          {transaction.source}
                        </span>
                      </td>
                      <td>
                        {transaction.clientName}
                        <div className="table-muted">{transaction.notes}</div>
                      </td>
                      <td>{formatCurrency(transaction.amount)}</td>
                      <td>{transaction.reference}</td>
                      <td>{transaction.method}</td>
                      <td>{formatDateTime(transaction.recordedAt)}</td>
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
                  style={{ minHeight: 38, padding: "0 14px", borderRadius: 10, cursor: result.hasPrev ? "pointer" : "default" }}
                >
                  Previous
                </button>
                <button
                  className="btn-primary"
                  disabled={!result.hasNext}
                  onClick={() => handlePageChange(result.page + 1)}
                  style={{ minHeight: 38, padding: "0 14px", borderRadius: 10, cursor: result.hasNext ? "pointer" : "default" }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </AppShell>
  );
}