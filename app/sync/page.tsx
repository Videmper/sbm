"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { formatDateTime } from "@/lib/format";
import { getSyncSnapshot } from "@/lib/data";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Upload } from "lucide-react";

export default async function SyncPage() {
  const sync = await getSyncSnapshot();

  return (
    <AppShell
      title="Sync Center"
      description="Legacy import monitoring, M-PESA callback ingestion, and data pipeline status."
      badge="Data Pipeline"
      currentPath="/sync"
    >
      <div className="metric-grid">
        <StatCard
          label="Last Sync"
          value={sync.lastSyncLabel}
          helper="Latest recorded sync activity"
          tone="blue"
          icon={<RefreshCw size={18} />}
        />
        <StatCard
          label="Pending Callbacks"
          value={String(sync.pendingCallbacks)}
          helper="Awaiting processing"
          tone="amber"
          icon={<Loader2 size={18} />}
        />
        <StatCard
          label="Processed Callbacks"
          value={String(sync.processedCallbacks)}
          helper="Successfully ingested"
          tone="emerald"
          icon={<CheckCircle2 size={18} />}
        />
        <StatCard
          label="Failed Callbacks"
          value="0"
          helper="Requiring manual review"
          tone="rose"
          icon={<AlertCircle size={18} />}
        />
      </div>

      <SectionCard
        title="Sync Jobs"
        description="Recent pipeline executions and M-PESA callback processing history."
      >
        <div className="highlight-list">
          {sync.runs.map((run) => (
            <div className="highlight-item" key={run.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{run.jobName.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</strong>
                  <span className={`status-pill status-pill-${run.status}`} style={{ marginLeft: 8, fontSize: "0.7rem" }}>
                    {run.status.toUpperCase()}
                  </span>
                </div>
                <span className="table-muted">{formatDateTime(run.startedAt)}</span>
              </div>
              <p className="sync-details">{run.details || "No details available."}</p>
              {run.finishedAt && (
                <div className="table-muted" style={{ fontSize: "0.8rem" }}>
                  Completed: {formatDateTime(run.finishedAt)}
                </div>
              )}
            </div>
          ))}
          {sync.runs.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)" }}>
              <RefreshCw size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No sync jobs recorded yet.</p>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Callback Log"
        description="M-PESA Daraja callback records waiting for processing."
        style={{ marginTop: 22 }}
      >
        <div className="mini-stat">
          <span className="mini-label"><RefreshCw size={14} /> Pending Processing</span>
          <strong className="mini-value">{sync.pendingCallbacks}</strong>
        </div>
        <div className="mini-stat">
          <span className="mini-label"><CheckCircle2 size={14} /> Successfully Processed</span>
          <strong className="mini-value">{sync.processedCallbacks}</strong>
        </div>
        <div className="mini-stat">
          <span className="mini-label"><AlertCircle size={14} /> Error Rate</span>
          <strong className="mini-value">
            {sync.pendingCallbacks + sync.processedCallbacks > 0
              ? ((sync.pendingCallbacks / (sync.pendingCallbacks + sync.processedCallbacks)) * 100).toFixed(1)
              : "0.0"}%
          </strong>
        </div>
      </SectionCard>

      <SectionCard
        title="Manual Operations"
        description="Force sync, backup, and emergency operations."
        style={{ marginTop: 22 }}
      >
        <div className="highlight-list">
          <div className="highlight-item" style={{ cursor: "pointer" }}>
            <strong><Upload size={14} style={{ verticalAlign: "middle", marginRight: 8 }} /> Force Legacy Sync</strong>
            <p className="table-muted">Re-import legacy transactions from the old database. Use with caution.</p>
          </div>
          <div className="highlight-item" style={{ cursor: "pointer" }}>
            <strong><RefreshCw size={14} style={{ verticalAlign: "middle", marginRight: 8 }} /> Retry Failed Callbacks</strong>
            <p className="table-muted">Re-process any M-PESA callbacks that failed on first attempt.</p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}