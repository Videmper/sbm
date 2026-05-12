import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/clients - List all clients with optional search/filter/pagination
 * POST /api/clients - Create a new client
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const query = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const offset = (page - 1) * limit;

  try {
    const supabase = createSupabaseAdminClient();
    let dbQuery = supabase
      .from("clients")
      .select("id, member_no, first_name, last_name, phone, business_name, county, savings_only, status, created_at", { count: "exact" });

    if (query) {
      dbQuery = dbQuery.or(`full_name.ilike.%${query}%,member_no.ilike.%${query}%,phone.ilike.%${query}%`);
    }
    if (status) {
      dbQuery = dbQuery.eq("status", status);
    }

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

    const { data, error } = await supabase
      .from("clients")
      .insert({
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone,
        alt_phone: body.alt_phone,
        email: body.email,
        id_number: body.id_number,
        dob: body.dob,
        gender: body.gender,
        marital_status: body.marital_status,
        county: body.county,
        business_name: body.business_name,
        business_type: body.business_type,
        business_location: body.business_location,
        address: body.address,
        savings_only: body.savings_only ?? false,
        loan_officer_id: body.loan_officer_id,
        field_officer_id: body.field_officer_id,
        status: body.status || "active",
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