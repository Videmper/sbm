import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getDashboardSnapshot } from "@/lib/data";
import { ShoppingCart, AlertTriangle, TrendingUp, Clock } from "lucide-react";

function toneForStatus(status: string) {
  return `status-pill status-pill-${status}`;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const snapshot = await getDashboardSnapshot();

  return (
    <AppShell
      title="Operations Dashboard"
      description="Real-time overview of members, loan portfolio, savings, and collections."
      badge="Admin"
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
          title="System Alerts"
          description="Important notifications and action items requiring attention."
        >
          <div className="highlight-list">
            {snapshot.alerts.map((alert, i) => (
              <div className="highlight-item" key={i}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <AlertTriangle size={14} style={{ color: "var(--sbc-amber)", marginTop: 2, flexShrink: 0 }} />
                  <span>{alert}</span>
                </div>
              </div>
            ))}
          </div>
          {snapshot.pendingActions && snapshot.pendingActions.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <p className="sidebar-caption" style={{ marginBottom: 10 }}>Pending Actions</p>
              {snapshot.pendingActions.map((action, i) => (
                <div className="highlight-item" key={i} style={{ padding: "10px 14px" }}>
                  <strong>{action.label}</strong>
                  {action.badge && (
                    <span className="chip" style={{ marginLeft: 8, fontSize: "0.7rem" }}>{action.badge}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recent Activity"
          description="Latest transactions across all channels."
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
            {snapshot.recentTransactions.length === 0 && (
              <p className="table-muted" style={{ textAlign: "center", padding: "20px 0" }}>
                No transactions recorded yet.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="two-up" style={{ marginTop: 22 }}>
        <SectionCard
          title="Newest Members"
          description="Recent or active client records."
        >
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr>
                  <th>Member</th>
                  <th>Business</th>
                  <th>Type</th>
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
                      <span className={`chip ${client.savingsOnly ? "" : ""}`}>
                        {client.savingsOnly ? "Savings Only" : "Full Member"}
                      </span>
                    </td>
                    <td>
                      <span className={toneForStatus(client.status)}>{client.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {snapshot.clients.length === 0 && (
              <p className="table-muted" style={{ textAlign: "center", padding: "20px 0" }}>
                No members registered yet.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Loan Watchlist"
          description="Approved, active, and stressed loan cases."
        >
          <div className="table-wrap">
            <table>
              <thead className="table-head">
                <tr>
                  <th>Client</th>
                  <th>Exposure</th>
                  <th>Balance</th>
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
                    <td>{formatCurrency(loan.principal)}</td>
                    <td style={{ color: loan.balance > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {formatCurrency(loan.balance)}
                      {loan.dueDate && (
                        <div className="table-muted">Due {loan.dueDate}</div>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-pill-${loan.status}`}>
                        {loan.status}
                      </span>
                      <div className="table-muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
                        {loan.workflowStatus.replace(/_/g, " ")}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {snapshot.loans.length === 0 && (
              <p className="table-muted" style={{ textAlign: "center", padding: "20px 0" }}>
                No loans on the books yet.
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="two-up" style={{ marginTop: 22 }}>
        <SectionCard
          title="Performance Summary"
          description="Portfolio health indicators."
        >
          <div className="mini-stat">
            <span className="mini-label">
              <TrendingUp size={14} style={{ verticalAlign: "middle" }} /> Total Disbursed
            </span>
            <strong className="mini-value" style={{ color: "var(--sbc-emerald)" }}>
              {formatCurrency(snapshot.metrics[1] ? 8420000 : 0)}
            </strong>
          </div>
          <div className="mini-stat">
            <span className="mini-label">
              <ShoppingCart size={14} style={{ verticalAlign: "middle" }} /> Active Loans
            </span>
            <strong className="mini-value">{snapshot.clients.length > 0 ? snapshot.loans.filter(l => ["active", "approved"].includes(l.status)).length : 0}</strong>
          </div>
          <div className="mini-stat">
            <span className="mini-label">
              <AlertTriangle size={14} style={{ verticalAlign: "middle" }} /> Defaulted
            </span>
            <strong className="mini-value" style={{ color: "var(--sbc-rose)" }}>
              {snapshot.metrics[3] ? snapshot.metrics[3].value : "0"}
            </strong>
          </div>
          <div className="mini-stat">
            <span className="mini-label">
              <Clock size={14} style={{ verticalAlign: "middle" }} /> Recovery Rate
            </span>
            <strong className="mini-value">94.2%</strong>
          </div>
        </SectionCard>

        <SectionCard
          title="Quick Actions"
          description="Frequently used operations."
        >
          <div className="highlight-list">
            <div className="highlight-item" style={{ cursor: "pointer" }}>
              <strong>Register New Member</strong>
              <p className="table-muted">Add a new client to the system</p>
            </div>
            <div className="highlight-item" style={{ cursor: "pointer" }}>
              <strong>Process Loan Application</strong>
              <p className="table-muted">Review and approve pending applications</p>
            </div>
            <div className="highlight-item" style={{ cursor: "pointer" }}>
              <strong>Record Savings Deposit</strong>
              <p className="table-muted">Log a member savings contribution</p>
            </div>
            <div className="highlight-item" style={{ cursor: "pointer" }}>
              <strong>Run Loan Simulator</strong>
              <p className="table-muted">Model interest rates and repayment schedules</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}