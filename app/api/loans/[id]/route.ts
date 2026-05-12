import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * GET /api/loans/[id] - Get a single loan with full detail
 * POST /api/loans/[id]/payments - Record a payment against a loan
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    const supabase = createSupabaseAdminClient();
    const { data: loan, error } = await supabase
      .from("loans")
      .select(`
        *,
        clients(full_name),
        loan_payment_breakdowns(
          id, payment_date, receipt_number, payment_method,
          source_channel, total_amount, loan_amount, savings_amount,
          rounded_bucket_amount, notes
        ),
        guarantors(id, name, relation, phone, guaranteed_amount, signature_confirmed),
        collateral(id, collateral_type, make_model, value_amount, status)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    const clientName = loan.clients?.full_name ?? "Unknown";

    return NextResponse.json({
      ok: true,
      data: {
        ...loan,
        client_name: clientName,
        payments: loan.loan_payment_breakdowns ?? [],
        guarantors: loan.guarantors ?? [],
        collateral: loan.collateral ?? [],
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Supabase not configured" },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createSupabaseAdminClient();

    // Validate
    if (!body.client_id || !body.amount) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: client_id, amount" },
        { status: 400 }
      );
    }

    // Fetch loan to get current balance
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("balance, total_repayment, amount_approved, status, workflow_status")
      .eq("id", id)
      .single();

    if (loanError || !loan) throw new Error("Loan not found");

    const paymentAmount = Number(body.amount);
    const loanBalance = Number(loan.balance);

    // Determine allocation
    const loanPayment = Math.min(paymentAmount, loanBalance);
    const savingsAmount = body.savings_amount ?? 0;
    const roundedBucketAmount = body.rounded_bucket_amount ?? 0;
    const totalAmount = paymentAmount;

    // Insert payment breakdown
    const { data: breakdown, error: breakdownError } = await supabase
      .from("loan_payment_breakdowns")
      .insert({
        loan_id: id,
        client_id: body.client_id,
        payment_date: body.payment_date || new Date().toISOString().split("T")[0],
        receipt_number: body.receipt_number,
        payment_method: body.payment_method || "cash",
        source_channel: body.source_channel || "manual",
        total_amount: totalAmount,
        loan_amount: loanPayment,
        savings_amount: savingsAmount,
        rounded_bucket_amount: roundedBucketAmount,
        notes: body.notes,
      })
      .select()
      .single();

    if (breakdownError) throw breakdownError;

    // Update loan balance
    const newBalance = loanBalance - loanPayment;
    const newTotalRepayment = Number(loan.total_repayment) + loanPayment;

    let newStatus = loan.status;
    let newWorkflowStatus = loan.workflow_status;

    if (newBalance <= 0) {
      newStatus = "completed";
      newWorkflowStatus = "closed";
    }

    await supabase
      .from("loans")
      .update({
        balance: newBalance,
        total_repayment: newTotalRepayment,
        status: newStatus,
        workflow_status: newWorkflowStatus,
      })
      .eq("id", id);

    // Record repayment
    await supabase.from("repayments").insert({
      loan_id: id,
      client_id: body.client_id,
      payment_date: body.payment_date || new Date().toISOString().split("T")[0],
      amount: totalAmount,
      principal_amount: loanPayment,
      interest_amount: 0,
      savings_amount: savingsAmount,
      method: body.payment_method || "cash",
      receipt_number: body.receipt_number,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true, data: breakdown }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}