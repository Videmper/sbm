import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getDashboardSnapshot } from "@/lib/data";

function toneForStatus(status: string) {
  return `status-pill status-pill-${status}`;
}

export default async function DashboardPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <AppShell
      title="Operations Dashboard"
      description="A modern overview for clients, loan book, savings, sync posture, and payment readiness."
      badge="Admin view"
      currentPath="/dashboard"
    >
      <div className="metric-grid">
        {snapshot.metrics.map((metric) => (
          <StatCard
            key={metric.label}
            helper={metric.helper}
            label={metric.label}
            tone={metric.tone}
            value={metric.value}
          />
        ))}
      </div>

      <div className="two-up" style={{ marginTop: 22 }}>
        <SectionCard
          title="Modernization Alerts"
          description="Important rollout notes carried into the new shell."
        >
          <div className="highlight-list">
            {snapshot.alerts.map((alert) => (
              <div className="highlight-item" key={alert}>
                {alert}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Transactions"
          description="The dashboard keeps M-PESA, live receipts, and legacy imports in one stream."
        >
          <div className="highlight-list">
            {snapshot.recentTransactions.map((transaction) => (
              <div className="highlight-item" key={transaction.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>{transaction.clientName}</strong>
                  <span className={toneForStatus(transaction.source)}>
                    {transaction.source}
                  </span>
                </div>
                <div className="table-muted">
                  {formatCurrency(transaction.amount)} • {transaction.reference} •{" "}
                  {formatDateTime(transaction.recordedAt)}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="two-up" style={{ marginTop: 22 }}>
        <SectionCard
          title="Newest Members"
          description="Fast access to recent or active client records."
        >
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr>
                  <th>Member</th>
                  <th>Business</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.clients.map((client) => (
                  <tr className="table-row" key={client.id}>
                    <td>
                      <strong>{client.fullName}</strong>
                      <div className="table-muted">{client.memberNo}</div>
                    </td>
                    <td>
                      {client.businessName}
                      <div className="table-muted">{client.county}</div>
                    </td>
                    <td>
                      <span className={toneForStatus(client.status)}>{client.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Loan Watchlist"
          description="A lightweight view of approved, active, and stressed cases."
        >
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr>
                  <th>Client</th>
                  <th>Exposure</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.loans.map((loan) => (
                  <tr className="table-row" key={loan.id}>
                    <td>
                      <strong>{loan.clientName}</strong>
                      <div className="table-muted">{loan.category}</div>
                    </td>
                    <td>
                      {formatCurrency(loan.balance)}
                      <div className="table-muted">Due {loan.dueDate.slice(0, 10)}</div>
                    </td>
                    <td>
                      <span className={toneForStatus(loan.status)}>{loan.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
