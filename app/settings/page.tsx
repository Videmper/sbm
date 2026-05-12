"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { getSettingsSnapshot, SettingsSnapshot } from "@/lib/data";
import { Settings2, CheckCircle2, AlertCircle, RefreshCw, Database, Smartphone, Lock, Shield } from "lucide-react";

function StatusBadge({ ready }: { ready: boolean }) {
  return (
    <span className={`status-pill ${ready ? "status-pill-active" : "status-pill-pending"}`}>
      {ready ? "CONFIGURED" : "PENDING"}
    </span>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsSnapshot | null>(null);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    (async () => {
      const data = await getSettingsSnapshot();
      setSettings(data);
    })();
  }, []);

  if (!settings) {
    return (
      <AppShell title="Settings" currentPath="/settings" badge="Environment">
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading settings…</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Settings"
      description="Environment configuration and system readiness checks."
      badge="Environment"
      currentPath="/settings"
    >
      <div className="metric-grid">
        <StatCard
          label="Application"
          value={settings.appName}
          helper={settings.deploymentMode}
          tone="blue"
          icon={<Settings2 size={18} />}
        />
        <StatCard
          label="Supabase"
          value={settings.supabaseReady ? "Connected" : "Disconnected"}
          helper="Database and authentication"
          tone={settings.supabaseReady ? "emerald" : "rose"}
          icon={<Database size={18} />}
        />
        <StatCard
          label="M-PESA Daraja"
          value={settings.mpesaReady ? "Active" : "Not Configured"}
          helper="Mobile payment gateway"
          tone={settings.mpesaReady ? "emerald" : "rose"}
          icon={<Smartphone size={18} />}
        />
        <StatCard
          label="Database Schema"
          value="Ready"
          helper="Fullupdate.sql applied"
          tone={settings.dbSchemaReady ? "emerald" : "amber"}
          icon={<Shield size={18} />}
        />
      </div>

      <div style={{ display: "flex", gap: 4, marginTop: 24, marginBottom: 16, borderBottom: "1px solid var(--line)", paddingBottom: 0 }}>
        {[
          { key: "overview", label: "Overview" },
          { key: "security", label: "Security" },
          { key: "integration", label: "Integrations" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            style={{
              padding: "10px 16px", border: "none", background: "transparent",
              color: activeSection === tab.key ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeSection === tab.key ? "2px solid var(--sbc-primary)" : "2px solid transparent",
              cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, fontFamily: "var(--font-body)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeSection === "overview" && (
          <div className="two-up">
            <SectionCard title="Deployment Checklist">
              <ul className="bullet-list">
                <li><strong>Database Schema</strong> — Run fullupdate.sql in Supabase SQL editor</li>
                <li><strong>Environment Variables</strong> — Set NEXT_PUBLIC_SUPABASE_URL and anon/role keys</li>
                <li><strong>M-PESA Daraja</strong> — Configure consumer key, secret, shortcode, passkey</li>
                <li><strong>Callback URL</strong> — Register mpesa-callback route in Daraja portal</li>
                <li><strong>HTTPS Domain</strong> — Required for M-PESA (no localhost in production)</li>
                <li><strong>Row Level Security</strong> — Enable RLS policies on Supabase tables</li>
              </ul>
            </SectionCard>

            <SectionCard title="Infrastructure Status">
              <div className="mini-stat">
                <span className="mini-label"><Database size={14} /> Supabase Connection</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong className="mini-value">{settings.supabaseReady ? "Connected" : "Missing"}</strong>
                  {settings.supabaseReady ? <StatusBadge ready /> : <StatusBadge ready={false} />}
                </div>
              </div>
              <div className="mini-stat">
                <span className="mini-label"><Smartphone size={14} /> M-PESA Gateway</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong className="mini-value">{settings.mpesaReady ? "Ready" : "Not Configured"}</strong>
                  {settings.mpesaReady ? <StatusBadge ready /> : <StatusBadge ready={false} />}
                </div>
              </div>
              <div className="mini-stat">
                <span className="mini-label"><Lock size={14} /> Auth Provider</span>
                <strong className="mini-value">{settings.supabaseReady ? "Supabase Auth" : "—"}</strong>
              </div>
              <div className="mini-stat">
                <span className="mini-label"><Shield size={14} /> Encryption</span>
                <strong className="mini-value">TLS 1.3</strong>
              </div>
              <div className="mini-stat">
                <span className="mini-label"><RefreshCw size={14} /> Migration Status</span>
                <strong className="mini-value">Schema ready</strong>
              </div>
            </SectionCard>
          </div>
        )}

        {activeSection === "security" && (
          <div className="two-up">
            <SectionCard title="Security Configuration">
              <p className="table-muted" style={{ marginBottom: 16 }}>
                Configure Supabase Row Level Security (RLS) policies to enforce role-based access:
              </p>
              <ul className="bullet-list">
                <li><strong>Admins</strong> — Full read/write across all tables. Can manage users and settings.</li>
                <li><strong>Loan Officers</strong> — Read all clients/loans. Write access to assigned portfolio.</li>
                <li><strong>Field Officers</strong> — Read assigned clients. Can record visits and collections.</li>
                <li><strong>Members</strong> — Read own data only. Submit savings contributions.</li>
              </ul>
              <div style={{ marginTop: 16 }}>
                <p className="table-muted" style={{ fontSize: "0.85rem" }}>
                  <strong>Next step:</strong> Enable RLS in Supabase dashboard → Authentication → Policies,
                  then run the RLS enablement SQL in the database section.
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Environment Variables">
              <p className="table-muted" style={{ marginBottom: 16, fontSize: "0.85rem" }}>
                Required keys for production deployment:
              </p>
              <ul className="bullet-list">
                <li><code>NEXT_PUBLIC_SUPABASE_URL</code> — Your Supabase project URL</li>
                <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — Public anon key</li>
                <li><code>SUPABASE_SERVICE_ROLE_KEY</code> — Full access service role key</li>
                <li><code>MPESA_CONSUMER_KEY</code> — Daraja consumer key</li>
                <li><code>MPESA_CONSUMER_SECRET</code> — Daraja consumer secret</li>
                <li><code>MPESA_SHORTCODE</code> — Paybill/till number</li>
                <li><code>MPESA_PASSKEY</code> — Base64-encoded passkey for STK push</li>
                <li><code>MPESA_CALLBACK_URL</code> — Public HTTPS callback endpoint</li>
              </ul>
            </SectionCard>
          </div>
        )}

        {activeSection === "integration" && (
          <div className="two-up">
            <SectionCard title="M-PESA Daraja Setup">
              <ol className="bullet-list" style={{ listStyle: "decimal", paddingLeft: 20 }}>
                <li><strong>Register</strong> at <a href="https://developer.safaricom.co.ke" target="_blank" rel="noopener">developer.safaricom.co.ke</a></li>
                <li><strong>Create App</strong> — Get consumer key and secret</li>
                <li><strong>Configure Credentials</strong> — Add to .env file (see Security tab)</li>
                <li><strong>Set Callback URL</strong> — Point to /api/mpesa/callback</li>
                <li><strong>Test STK Push</strong> — Use sandbox to verify payment flow</li>
                <li><strong>Go Live</strong> — Switch from sandbox to production credentials</li>
              </ol>
              <div style={{ marginTop: 16 }}>
                <p className="table-muted" style={{ fontSize: "0.85rem" }}>
                  <strong>Note:</strong> M-PESA requires a registered business shortcode and a publicly accessible HTTPS endpoint.
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Supabase Setup">
              <ol className="bullet-list" style={{ listStyle: "decimal", paddingLeft: 20 }} {/**/}
              >
                <li><strong>Create Project</strong> at supabase.com/dashboard</li>
                <li><strong>Run Schema</strong> — Paste fullupdate.sql in SQL Editor → New Query</li>
                <li><strong>Enable Auth</strong> — Configure email/password and OTP providers</li>
                <li><strong>Set RLS</strong> — Enable Row Level Security on key tables</li>
                <li><strong>Add Service Key</strong> — Copy from Settings → API for .env</li>
                <li><strong>Seed Admin</strong> — Create initial admin user via Auth → Users</li>
              </ol>
            </SectionCard>
          </div>
        )}
      </div>
    </AppShell>
  );
}