import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/loans - List all loans with optional filters
 * POST /api/loans - Create a new loan
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";
    const clientId = searchParams.get("client_id") || "";
    const offset = (page - 1) * limit;

    const supabase = createSupabaseAdminClient();
    let dbQuery = supabase
      .from("loans")
      .select(`
        id, client_id, amount_requested, amount_approved, status,
        workflow_status, repayment_frequency, repayment_plan,
        due_date, category, term_weeks, loan_period_days,
        interest_rate, interest_amount, total_repayment, balance,
        clients(first_name, last_name)
      `, { count: "exact" });

    if (status) dbQuery = dbQuery.eq("status", status);
    if (clientId) dbQuery = dbQuery.eq("client_id", clientId);

    const { data, count, error } = await dbQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const supabase = createSupabaseAdminClient();

    // Validate required fields
    if (!body.client_id || !body.amount_requested || !body.category) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: client_id, amount_requested, category" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("loans")
      .insert({
        client_id: body.client_id,
        loan_officer_id: body.loan_officer_id,
        category: body.category,
        amount_requested: body.amount_requested,
        amount_approved: body.amount_approved ?? body.amount_requested,
        interest_rate: body.interest_rate ?? 0.03,
        interest_amount: body.interest_amount ?? 0,
        processing_fee: body.processing_fee ?? 0,
        insurance_fee: body.insurance_fee ?? 0,
        term_weeks: body.term_weeks ?? 12,
        loan_period_days: body.loan_period_days ?? 84,
        repayment_plan: body.repayment_plan ?? "weekly",
        repayment_frequency: body.repayment_frequency ?? "weekly",
        purpose: body.purpose,
        loan_purpose: body.loan_purpose,
        status: "pending",
        workflow_status: "to_be_visited",
        balance: body.amount_approved ?? body.amount_requested,
        total_repayment: 0,
        net_disbursed: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}