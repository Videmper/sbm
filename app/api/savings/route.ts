import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/savings - Get all member savings
 * POST /api/savings - Record a savings contribution
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  try {
    const supabase = createSupabaseAdminClient();
    let dbQuery = supabase
      .from("member_portfolio_balances")
      .select("*, total_balances as total(client_id, mandatory_savings, mandatory_shares, multiplier_balance, withdrawable_balance)", { count: "exact" });

    if (query) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,member_no.ilike.%${query}%`);
    }

    const { data, count, error } = await dbQuery
      .order("full_name", { ascending: true })
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

    // Validate
    if (!body.client_id || !body.amount || !body.savings_bucket) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: client_id, amount, savings_bucket" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("savings_ledger")
      .insert({
        client_id: body.client_id,
        amount: body.amount,
        savings_bucket: body.savings_bucket,
        transaction_type: "deposit",
        transaction_date: body.transaction_date || new Date().toISOString().split("T")[0],
        source_channel: body.source_channel || "manual",
        receipt_number: body.receipt_number,
        notes: body.notes,
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