import { NextResponse } from "next/server";
import { createSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase";

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
  if (value === null || value === undefined) {
    return null;
  }

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
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const transaction = extractTransaction(payload);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      stored: false,
      message: "Callback received. Supabase is not configured yet, so this was accepted but not persisted.",
      transaction,
    });
  }

  const supabase = createSupabaseAdminClient();
  const callbackInsert = await supabase.from("mpesa_callback_logs").insert({
    raw_payload: payload,
    merchant_request_id: transaction.merchantRequestId,
    checkout_request_id: transaction.checkoutRequestId,
    result_code: transaction.resultCode,
    result_desc: transaction.resultDesc,
    processed: false,
  }).select("id").single();

  if (callbackInsert.error) {
    return NextResponse.json(
      {
        ok: false,
        error: callbackInsert.error.message,
      },
      { status: 500 },
    );
  }

  if (transaction.mpesaReceiptNumber) {
    await supabase.from("mpesa_transactions").upsert(
      {
        callback_log_id: callbackInsert.data.id,
        merchant_request_id: transaction.merchantRequestId,
        checkout_request_id: transaction.checkoutRequestId,
        mpesa_receipt_number: transaction.mpesaReceiptNumber,
        result_code: transaction.resultCode,
        result_desc: transaction.resultDesc,
        amount: transaction.amount,
        payer_phone: transaction.phoneNumber,
        transaction_date: transaction.transactionDate,
        status: transaction.resultCode === 0 ? "success" : "failed",
      },
      {
        onConflict: "mpesa_receipt_number",
      },
    );
  }

  await supabase
    .from("mpesa_callback_logs")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("id", callbackInsert.data.id);

  return NextResponse.json({
    ok: true,
    stored: true,
    callbackId: callbackInsert.data.id,
    transaction,
  });
}
