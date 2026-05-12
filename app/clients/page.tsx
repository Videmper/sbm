"use client";

import { useState, useEffect, use } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import { getClientsSnapshot } from "@/lib/data";
import type { PagedResult, ClientRecord } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ page?: string; query?: string }>;
}

export default function ClientsPage({ searchParams }: PageProps) {
  const [params] = useState(() => ({
    page: 1,
    limit: 20,
  }));
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<PagedResult<ClientRecord> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getClientsSnapshot({ ...params, query: searchQuery });
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

  return (
    <AppShell
      title="Clients"
      description="Member records, assignment readiness, and savings-only visibility in a cleaner grid."
      badge="Client registry"
      currentPath="/clients"
    >
      <SectionCard
        title="Member Directory"
        description="This page mirrors the old client list but gives us a cleaner path for modern filters, imports, and edits."
      >
        <form onSubmit={handleSearch} className="table-wrap" style={{ marginBottom: 16 }}>
          <input
            type="search"
            placeholder="Search by name, member number, or phone..."
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
            Loading clients…
          </div>
        )}

        {!loading && result && result.data.length === 0 && (
          <EmptyState
            title="No clients found"
            description={searchQuery ? `No results for "${searchQuery}"` : "No clients registered yet."}
          />
        )}

        {!loading && result && result.data.length > 0 && (
          <>
            <div className="table-wrap" style={{ overflowX: "auto" }}>
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Member</th>
                    <th>Contact</th>
                    <th>Business</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((client) => (
                    <tr className="table-row" key={client.id}>
                      <td>
                        <strong>{client.fullName}</strong>
                        <div className="table-muted">{client.memberNo}</div>
                      </td>
                      <td>
                        {client.phone}
                        <div className="table-muted">{client.county}</div>
                      </td>
                      <td>
                        {client.businessName}
                        {client.savingsOnly && (
                          <div className="table-muted">Savings-only member</div>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill status-pill-${client.status}`}>
                          {client.status}
                        </span>
                      </td>
                      <td>{formatDate(client.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <span className="table-muted">
                Showing {result.data.length} of {result.total} clients (page {result.page} of {result.totalPages})
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