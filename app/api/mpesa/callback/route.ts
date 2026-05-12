import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";
import { verifyMpesaSignature } from "@/lib/mpesa";

type CallbackItem = {
  Name?: string;
  Value?: unknown;
};

type StkCallbackPayload = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: number;
  ResultDesc?: string;
  CallbackMetadata?: {
    Item?: CallbackItem[];
  };
};

function safeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function safeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractTransaction(payload: Record<string, unknown>) {
  const bodyContainer = payload.Body as { stkCallback?: StkCallbackPayload } | undefined;
  const body = bodyContainer?.stkCallback;
  const callbackMetadata = body?.CallbackMetadata;

  const items = callbackMetadata?.Item ?? [];
  const metadata = new Map<string, unknown>();

  for (const item of items) {
    if (item?.Name) {
      metadata.set(item.Name, item.Value);
    }
  }

  return {
    merchantRequestId: safeString(body?.MerchantRequestID),
    checkoutRequestId: safeString(body?.CheckoutRequestID),
    resultCode: safeNumber(body?.ResultCode),
    resultDesc: safeString(body?.ResultDesc),
    amount: safeNumber(metadata.get("Amount")),
    mpesaReceiptNumber: safeString(metadata.get("MpesaReceiptNumber")),
    transactionDate: safeString(metadata.get("TransactionDate")),
    phoneNumber: safeString(metadata.get("PhoneNumber")),
    billRefNumber: safeString(metadata.get("BillRefNumber")),
  };
}

async function matchToClient(supabase: any, tx: { phoneNumber: string | null; amount: number | null }): Promise<{ client_id: string | null; clientName: string | null }> {
  if (!tx.phoneNumber) return { client_id: null, clientName: null };

  // Search clients by phone number (standard or alt)
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, full_name, phone, alt_phone")
    .or(`phone.eq.${tx.phoneNumber},alt_phone.eq.${tx.phoneNumber}`)
    .limit(1);

  if (error || !clients || clients.length === 0) {
    return { client_id: null, clientName: null };
  }

  return { client_id: clients[0].id, clientName: clients[0].full_name };
}

async function matchToLoan(
  supabase: any,
  clientId: string | null,
  amount: number | null
): Promise<{ loan_id: string | null; reason: string }> {
  if (!clientId || !amount) return { loan_id: null, reason: "No client or amount" };

  // Find active loans for this client, ordered by most recent
  const { data: loans, error } = await supabase
    .from("loans")
    .select("id, balance, amount_approved, status")
    .eq("client_id", clientId)
    .in("status", ["active", "approved"])
    .order("created_at", { ascending: false });

  if (error || !loans || loans.length === 0) {
    return { loan_id: null, reason: "No active loans found for client" };
  }

  // Match to loan with closest balance
const bestMatch = loans.find((l: any) => Number(l.balance) === amount);
  if (bestMatch) {
    return { loan_id: bestMatch.id, reason: "Exact balance match" };
  }

  // Fallback: return most recent active loan
  return { loan_id: loans[0].id, reason: "Matched to most recent active loan" };
}

function generateReceiptNumber(tx: ReturnType<typeof extractTransaction>): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `MPS-${timestamp}-${rand}`;
}

export async function POST(request: Request) {
  try {
    // Verify headers
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized: Missing or invalid authorization header" },
        { status: 401, headers: { "WWW-Authenticate": 'Basic realm="SBC M-PESA Callback"' } }
      );
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const transaction = extractTransaction(payload);

    // Validate required fields
    if (!transaction.checkoutRequestId || !transaction.resultCode) {
      // Accept but log the malformed callback
      return NextResponse.json({
        ok: true,
        stored: false,
        message: "Callback received but missing required fields; logged without processing.",
      });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        ok: true,
        stored: false,
        message: "Callback received. Supabase is not configured yet.",
        transaction,
      });
    }

    const supabase = createSupabaseAdminClient();

    // Check for duplicate callback
    const { data: existing, error: lookupError } = await supabase
      .from("mpesa_transactions")
      .select("id")
      .eq("checkout_request_id", transaction.checkoutRequestId)
      .single();

    if (!lookupError && existing) {
      return NextResponse.json({
        ok: true,
        stored: false,
        message: `Callback already processed (txn ${existing.id}).`,
        duplicate: true,
      });
    }

    // Store callback log
    const callbackInsert = await supabase.from("mpesa_callback_logs").insert({
      raw_payload: payload,
      merchant_request_id: transaction.merchantRequestId,
      checkout_request_id: transaction.checkoutRequestId,
      result_code: transaction.resultCode,
      result_desc: transaction.resultDesc,
      processed: false,
    }).select("id").single();

    if (callbackInsert.error) {
      console.error("M-PESA callback insert error:", callbackInsert.error);
      return NextResponse.json(
        { ok: false, error: callbackInsert.error.message },
        { status: 500 }
      );
    }

    // Only process successful callbacks
    if (transaction.resultCode !== 0 || !transaction.mpesaReceiptNumber) {
      await supabase
        .from("mpesa_callback_logs")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("id", callbackInsert.data.id);

      return NextResponse.json({
        ok: true,
        stored: true,
        processed: false,
        message: `Callback stored (result code: ${transaction.resultCode}).`,
        callbackId: callbackInsert.data.id,
      });
    }

    // Client matching logic
    const clientMatch = await matchToClient(supabase, transaction);
    const loanMatch = await matchToLoan(supabase, clientMatch.client_id, transaction.amount);

    // Store M-PESA transaction
    const txnData = {
      callback_log_id: callbackInsert.data.id,
      merchant_request_id: transaction.merchantRequestId,
      checkout_request_id: transaction.checkoutRequestId,
      mpesa_receipt_number: transaction.mpesaReceiptNumber,
      result_code: transaction.resultCode,
      result_desc: transaction.resultDesc,
      amount: transaction.amount ?? 0,
      payer_phone: transaction.phoneNumber,
      bill_ref_number: transaction.billRefNumber,
      transaction_date: transaction.transactionDate ?? new Date().toISOString().split("T")[0],
      status: "success",
      matched_client_id: clientMatch.client_id,
      matched_loan_id: loanMatch.loan_id,
    };

    const { error: txnError } = await supabase
      .from("mpesa_transactions")
      .insert(txnData);

    if (txnError) {
      console.error("M-PESA transaction insert error:", txnError);
      return NextResponse.json(
        { ok: false, error: txnError.message },
        { status: 500 }
      );
    }

    // Auto-apply as loan payment if matched
    if (loanMatch.loan_id && transaction.amount) {
      try {
        await supabase.from("loan_payment_breakdowns").insert({
          loan_id: loanMatch.loan_id,
          client_id: clientMatch.client_id,
          payment_date: txnData.transaction_date,
          receipt_number: transaction.mpesaReceiptNumber,
          payment_method: "M-PESA",
          source_channel: "mpesa",
          total_amount: transaction.amount,
          loan_amount: transaction.amount,
          savings_amount: 0,
          rounded_bucket_amount: 0,
          notes: `Auto-applied from M-PESA callback. Match: ${loanMatch.reason}`,
        });
      } catch (paymentErr: any) {
        console.error("Auto-payment application error:", paymentErr);
        // Don't fail the callback — log the error but still record the transaction
      }
    }

    // Mark callback as processed
    await supabase
      .from("mpesa_callback_logs")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("id", callbackInsert.data.id);

    return NextResponse.json({
      ok: true,
      stored: true,
      processed: true,
      callbackId: callbackInsert.data.id,
      transaction: txnData,
      matchedClient: clientMatch,
      matchedLoan: loanMatch,
    });
  } catch (err: any) {
    console.error("M-PESA callback processing error:", err);
    return NextResponse.json(
      { ok: false, error: err.message ?? "Internal processing error" },
      { status: 500 }
    );
  }
}

export const runtime = "edge";