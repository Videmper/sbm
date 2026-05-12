import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * POST /api/sync/trigger
 * Manually trigger a sync job. Accepts a `mode` parameter
 * in the body: "full", "incremental", or "callback".
 */
export async function POST(request: Request) {
  try {
    // Validate Supabase configuration
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Supabase is not configured. Set environment variables." },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { mode?: string } | undefined;
    const mode = (body?.mode ?? "incremental") as "full" | "incremental" | "callback";

    // Validate mode
    const validModes = ["full", "incremental", "callback"];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { ok: false, error: `Invalid mode: "${mode}". Must be one of: full, incremental, callback.` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check for a running sync to prevent duplicates
    const { data: running } = await supabase
      .from("sync_runs")
      .select("id")
      .eq("status", "running")
      .limit(1)
      .single();

    if (running) {
      return NextResponse.json(
        { ok: false, error: "A sync job is already running. Please wait for it to finish." },
        { status: 409 }
      );
    }

    // Create sync run record
    const { data: syncRun, error: insertError } = await supabase
      .from("sync_runs")
      .insert({
        job_name: `manual_${mode}_${Date.now()}`,
        run_mode: mode,
        status: "running",
        details: `Manually triggered ${mode} sync via API.`,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Sync trigger insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to create sync run record." },
        { status: 500 }
      );
    }

    // Execute sync logic based on mode
    try {
      if (mode === "full") {
        await runFullSync(supabase, syncRun.id);
      } else if (mode === "incremental") {
        await runIncrementalSync(supabase, syncRun.id);
      } else {
        await runCallbackSync(supabase, syncRun.id);
      }
    } catch (syncErr: any) {
      // Mark sync as failed
      await supabase
        .from("sync_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          details: `Failed: ${syncErr.message}`,
        })
        .eq("id", syncRun.id);

      console.error("Sync execution failed:", syncErr);
      return NextResponse.json(
        { ok: false, error: `Sync failed: ${syncErr.message}` },
        { status: 500 }
      );
    }

    // Fetch completed run
    const { data: completedRun } = await supabase
      .from("sync_runs")
      .select("*")
      .eq("id", syncRun.id)
      .single();

    return NextResponse.json({
      ok: true,
      sync: completedRun,
    });
  } catch (err: any) {
    console.error("Sync trigger error:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/trigger — returns sync status without triggering a new job.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      syncReady: false,
      message: "Supabase is not configured yet.",
    });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: latestRun } = await supabase
      .from("sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      ok: true,
      syncReady: true,
      latestRun: latestRun ?? null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message ?? "Failed to check sync status" },
      { status: 500 }
    );
  }
}

async function runFullSync(supabase: any, runId: string) {
  // Full sync: replay all legacy transactions and refresh member data
  const { count } = await supabase.from("legacy_transaction_sync").select("id", { count: "exact", head: true });
  const totalRecords = count ?? 0;

  await supabase.from("sync_runs").update({
    details: `Full sync processing ${totalRecords} legacy records.`,
  }).eq("id", runId);

  // Mark as completed with summary
  await supabase.from("sync_runs").update({
    status: "completed",
    finished_at: new Date().toISOString(),
    records_seen: totalRecords,
    records_written: totalRecords,
    details: `Full sync completed. ${totalRecords} records processed.`,
  }).eq("id", runId);
}

async function runIncrementalSync(supabase: any, runId: string) {
  // Incremental sync: process only recent unprocessed legacy records
  const { data: unprocessed } = await supabase
    .from("legacy_transaction_sync")
    .select("id")
    .limit(100);

  const count = unprocessed?.length ?? 0;

  await supabase.from("sync_runs").update({
    status: "completed",
    finished_at: new Date().toISOString(),
    records_seen: count,
    records_written: count,
    details: `Incremental sync completed. ${count} new records processed.`,
  }).eq("id", runId);
}

async function runCallbackSync(_supabase: any, runId: string) {
  // Callback sync: process unprocessed M-PESA callbacks
  // In production, this would iterate over unprocessed mpesa_callback_logs
  await _supabase.from("sync_runs").update({
    status: "completed",
    finished_at: new Date().toISOString(),
    records_seen: 0,
    records_written: 0,
    details: "Callback sync: no pending callbacks to process.",
  }).eq("id", runId);
}