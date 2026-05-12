"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { getClientById, getSavingsSnapshot, getTransactionsSnapshot } from "@/lib/data";
import type { ClientRecord, SavingsRecord, TransactionRecord } from "@/lib/types";

interface TabData {
  label: string;
  count: number;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = String(params.id);

  const [client, setClient] = useState<ClientRecord | null>(null);
  const [savings, setSavings] = useState<SavingsRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [clientData, savingsData, txData] = await Promise.all([
          getClientById(clientId),
          getSavingsSnapshot({ page: 1, limit: 50, searchQuery: clientId }),
          getTransactionsSnapshot({ page: 1, limit: 25, query: clientId }),
        ]);
        if (!cancelled) {
          setClient(clientData);
          setSavings(savingsData?.data ?? []);
          setTransactions(txData?.data ?? []);
          if (!clientData) setError("Client not found");
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? "Failed to load client");
          setClient(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) {
    return (
      <AppShell title="Client Detail" description="Loading..." badge="Client" currentPath="/clients">
        <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading client…</div>
      </AppShell>
    );
  }

  if (error || !client) {
    return (
      <AppShell title="Client Detail" description={error ?? "Not found"} badge="Client" currentPath="/clients">
        <SectionCard title="Error">
          <p className="table-muted">{error ?? "Client not found."}</p>
          <button
            className="btn-secondary"
            onClick={() => router.push("/clients")}
            style={{ marginTop: 16, minHeight: 38, padding: "0 16px", borderRadius: 10, cursor: "pointer" }}
          >
            Back to Clients
          </button>
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={client.fullName}
      description={`Member ${client.memberNo} — ${client.businessName}`}
      badge="Client Detail"
      currentPath="/clients"
    >
      {/* Profile Header */}
      <div className="profile-header" style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "1.8rem", marginBottom: 8 }}>{client.fullName}</h2>
          <p className="table-muted" style={{ margin: 0 }}>
            Member #{client.memberNo} • {client.county}
          </p>
          <p className="table-muted" style={{ margin: "4px 0 0" }}>
            Phone: {client.phone}
          </p>
          {client.businessName && (
            <p className="table-muted" style={{ margin: "4px 0 0" }}>
              Business: {client.businessName}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <span className={`status-pill status-pill-${client.status}`}>{client.status}</span>
          {client.savingsOnly && (
            <span className="status-pill status-pill-mpesa">Savings Only</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="metric-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Phone" value={client.phone} helper="Primary contact" tone="blue" />
        <StatCard label="County" value={client.county} helper="Region" tone="emerald" />
        <StatCard label="Business" value={client.businessName} helper="Business name" tone="amber" />
        <StatCard label="Membership" value={client.savingsOnly ? "Savings Only" : "Full"} helper="Account type" tone="rose" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 0 }}>
        {[
          { key: "overview", label: "Overview" },
          { key: "savings", label: `Savings (${savings.length})` },
          { key: "transactions", label: `Transactions (${transactions.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: "none",
              border: "none",
              color: activeTab === tab.key ? "var(--text)" : "var(--muted)",
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: "0.9rem",
              borderBottom: activeTab === tab.key ? "2px solid var(--emerald)" : "none",
              marginBottom: -1,
              fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <SectionCard title="Profile Details">
          <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {client.businessName && <DetailRow label="Business" value={client.businessName} />}
            {client.businessType && <DetailRow label="Business Type" value={client.businessType} />}
            {client.phone && <DetailRow label="Phone" value={client.phone} />}
            {client.email && <DetailRow label="Email" value={client.email} />}
            {client.address && <DetailRow label="Address" value={client.address} />}
            {client.city && <DetailRow label="City" value={client.city} />}
            {client.county && <DetailRow label="County" value={client.county} />}
            {client.ward && <DetailRow label="Ward" value={client.ward} />}
            {client.town && <DetailRow label="Town" value={client.town} />}
            {client.village && <DetailRow label="Village" value={client.village} />}
            {client.maritalStatus && <DetailRow label="Marital Status" value={client.maritalStatus} />}
            {client.idNumber && <DetailRow label="ID Number" value={client.idNumber} />}
            {client.dob && <DetailRow label="Date of Birth" value={client.dob} />}
            <DetailRow label="Status" value={client.status} />
            {client.savingsOnly && <DetailRow label="Account Type" value="Savings Only" />}
            <DetailRow label="Joined" value={formatDate(client.joinedAt)} />
          </div>
        </SectionCard>
      )}

      {activeTab === "savings" && (
        <SectionCard title="Savings by Bucket">
          {savings.length === 0 ? (
            <EmptyState title="No savings records" description="This client has no savings entries." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Bucket</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {savings.map((item, i) => (
                    <tr className="table-row" key={i}>
                      <td>{item.clientName}</td>
                      <td>{formatCurrency(item.mandatory)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {activeTab === "transactions" && (
        <SectionCard title="Recent Transactions">
          {transactions.length === 0 ? (
            <EmptyState title="No transactions" description="This client has no recorded transactions." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead className="table-head">
                  <tr>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Recorded</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr className="table-row" key={tx.id}>
                      <td>{tx.reference}</td>
                      <td>{formatCurrency(tx.amount)}</td>
                      <td>{formatDateTime(tx.recordedAt)}</td>
                      <td className="table-muted">{tx.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
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