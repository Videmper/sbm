import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/transactions - Get all transactions with filtering
 * POST /api/transactions - Record a manual transaction
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
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const offset = (page - 1) * limit;

  try {
    const supabase = createSupabaseAdminClient();

    let dbQuery = supabase
      .from("mpesa_transactions")
      .select(`
        *,
        clients(full_name)
      `, { count: "exact" });

    if (type) dbQuery = dbQuery.eq("status", type);
    if (query) {
      dbQuery = dbQuery.or(`mpesa_receipt_number.ilike.%${query}%,payer_phone.ilike.%${query}%`);
    }

    const { data, count, error } = await dbQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      data: (data ?? []).map((tx: any) => ({
        ...tx,
        client_name: tx.clients?.full_name ?? tx.payer_phone,
      })),
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

    if (!body.amount) {
      return NextResponse.json(
        { ok: false, error: "Amount is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("mpesa_transactions")
      .insert({
        merchant_request_id: body.merchant_request_id,
        checkout_request_id: body.checkout_request_id,
        mpesa_receipt_number: body.mpesa_receipt_number,
        amount: body.amount,
        payer_phone: body.payer_phone || body.client_phone,
        result_code: 0,
        result_desc: "Manual entry",
        transaction_date: body.transaction_date || new Date().toISOString().split("T")[0],
        status: body.status || "success",
        matched_client_id: body.matched_client_id,
        matched_loan_id: body.matched_loan_id,
        notes: body.notes || "Manually recorded",
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