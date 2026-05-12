"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import { getClientsSnapshot } from "@/lib/data";
import { Plus, Search, UserPlus } from "lucide-react";
import type { PagedResult, ClientRecord } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ page?: string; query?: string; status?: string }>;
}

export default function ClientsPage({ searchParams }: PageProps) {
  const router = useRouter();
  const [params, setParams] = useState({ page: 1, limit: 20 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [result, setResult] = useState<PagedResult<ClientRecord> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const searchParamsObj: any = { ...params, query: searchQuery };
        if (statusFilter !== "All") searchParamsObj.status = statusFilter;
        const data = await getClientsSnapshot(searchParamsObj);
        if (!cancelled) setResult(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.page, params.limit, searchQuery, statusFilter]);

  useEffect(() => {
    (async () => {
      const sp = await searchParams;
      if (sp.query) setSearchQuery(sp.query);
      if (sp.page) setParams((p) => ({ ...p, page: Number(sp.page) }));
    })();
  }, [searchParams]);

  const handlePageChange = (newPage: number) => setParams((p) => ({ ...p, page: newPage }));

  return (
    <AppShell
      title="Member Directory"
      description="Manage member records, assignments, and savings-only flag visibility."
      badge="Clients"
      currentPath="/clients"
    >
      <SectionCard
        title="All Members"
        description="Search, filter, and manage all registered members."
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="search"
              placeholder="Search by name, member number, or phone..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); params.page = 1; }}
              style={{
                width: "100%", minHeight: 44, borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
                color: "var(--text)", padding: "0 14px 0 36px", fontSize: "0.9rem",
                outline: "none",
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); params.page = 1; }}
            style={{
              minHeight: 44, borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)", color: "var(--text)",
              padding: "0 12px", fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="review">Under Review</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            className="btn-primary"
            onClick={() => router.push("/clients/new")}
            style={{ whiteSpace: "nowrap" }}
          >
            <UserPlus size={16} /> Register Member
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            Loading members…
          </div>
        )}

        {!loading && result && result.data.length === 0 && (
          <EmptyState
            title="No members found"
            description={searchQuery || statusFilter !== "All"
              ? "Try adjusting your filters."
              : "No members registered yet. Register your first member to get started."}
          />
        )}

        {!loading && result && result.data.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Member</th>
                    <th>Contact</th>
                    <th>Business</th>
                    <th>Type</th>
                    <th>Loan Officer</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((client) => (
                    <tr className="table-row" key={client.id} style={{ cursor: "pointer" }}>
                      <td>
                        <strong>{client.fullName}</strong>
                        <div className="table-muted">{client.memberNo}</div>
                      </td>
                      <td>
                        {client.phone}
                        {client.email && <div className="table-muted">{client.email}</div>}
                      </td>
                      <td>
                        {client.businessName}
                        <div className="table-muted">{client.county}</div>
                      </td>
                      <td>
                        <span className={`chip ${client.savingsOnly ? "" : ""}`}>
                          {client.savingsOnly ? "Savings" : "Full"}
                        </span>
                      </td>
                      <td className="table-muted">
                        {client.loanOfficerId ? `Officer #${client.loanOfficerId.slice(-4)}` : "—"}
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
          </>
        )}
      </SectionCard>
    </AppShell>
  );
}