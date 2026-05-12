import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { getSettingsSnapshot } from "@/lib/data";

export default async function SettingsPage() {
  const settings = await getSettingsSnapshot();

  return (
    <AppShell
      title="Settings"
      description="Connection readiness for Supabase, M-PESA, and the new deployment workflow."
      badge="Environment"
      currentPath="/settings"
    >
      <div className="three-up">
        <StatCard
          label="Application"
          value={settings.appName}
          helper={settings.deploymentMode}
          tone="blue"
        />
        <StatCard
          label="Supabase"
          value={settings.supabaseReady ? "Configured" : "Pending"}
          helper="Checked from environment variables"
          tone={settings.supabaseReady ? "emerald" : "amber"}
        />
        <StatCard
          label="M-PESA"
          value={settings.mpesaReady ? "Configured" : "Waiting"}
          helper="Daraja keys can be added when ready"
          tone={settings.mpesaReady ? "emerald" : "rose"}
        />
      </div>

      <div className="two-up" style={{ marginTop: 22 }}>
        <SectionCard
          title="Environment checklist"
          description="This is the small operational list to finish the backend migration."
        >
          <ul className="bullet-list">
            {settings.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Credential landing zone"
          description="The new app already expects the values below in `.env.local`."
        >
          <ul className="bullet-list">
            <li>`NEXT_PUBLIC_SUPABASE_URL`</li>
            <li>`NEXT_PUBLIC_SUPABASE_ANON_KEY`</li>
            <li>`SUPABASE_SERVICE_ROLE_KEY`</li>
            <li>`MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET`</li>
            <li>`MPESA_SHORTCODE`, `MPESA_PASSKEY`, and `MPESA_CALLBACK_URL`</li>
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
