import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { formatDateTime } from "@/lib/format";
import { getSyncSnapshot } from "@/lib/data";

export default async function SyncPage() {
  const sync = await getSyncSnapshot();

  return (
    <AppShell
      title="Sync Center"
      description="A home for legacy imports, callback ingestion, and future scheduled jobs."
      badge="Data pipeline"
      currentPath="/sync"
    >
      <div className="metric-grid">
        <StatCard
          label="Last Sync"
          value={sync.lastSyncLabel}
          helper="Latest recorded sync summary"
          tone="blue"
        />
        <StatCard
          label="Pending Callbacks"
          value={String(sync.pendingCallbacks)}
          helper="Waiting for processing"
          tone="amber"
        />
        <StatCard
          label="Processed Callbacks"
          value={String(sync.processedCallbacks)}
          helper="Stored for auditing"
          tone="emerald"
        />
        <StatCard
          label="Tracked Runs"
          value={String(sync.runs.length)}
          helper="Recent pipeline executions"
          tone="rose"
        />
      </div>

      <SectionCard
        title="Recent Jobs"
        description="The new schema includes a `sync_runs` table so your migration history becomes visible."
      >
        <div className="highlight-list">
          {sync.runs.map((run) => (
            <div className="highlight-item" key={run.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{run.jobName}</strong>
                <span className={`status-pill status-pill-${run.status}`}>{run.status}</span>
              </div>
              <p className="sync-details">{run.details}</p>
              <div className="table-muted">
                {formatDateTime(run.startedAt)}
                {run.finishedAt ? ` • finished ${formatDateTime(run.finishedAt)}` : " • still open"}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  );
}
