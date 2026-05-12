/**
 * M-PESA Callback Signature Verification
 * Verifies the integrity of callbacks from Daraja API
 */

import crypto from "crypto";

/**
 * Verify M-PESA callback signature
 * @param rawBody - The raw request body (JSON string)
 * @param signature - The signature from the request header
 * @param passkey - Your shortcode passkey from Daraja
 * @returns boolean indicating if signature is valid
 */
export function verifyMpesaSignature(
  rawBody: string,
  signature: string | null,
  passkey: string
): boolean {
  if (!signature || !rawBody || !passkey) return false;

  try {
    // Sort the JSON keys alphabetically and build the signature string
    const body = JSON.parse(rawBody);
    const sortedBody = sortKeys(body);
    const payload = JSON.stringify(sortedBody, null, 0);

    // Generate hash
    const hash = crypto
      .createHash("sha256")
      .update(payload + passkey)
      .digest("base64");

    return hash === signature;
  } catch {
    return false;
  }
}

/**
 * Recursively sort object keys alphabetically
 */
function sortKeys(obj: any): any {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);

  const sorted: Record<string, any> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = sortKeys(obj[key]);
  }
  return sorted;
}

/**
 * Generate STK Push password
 * @param shortcode - Your M-PESA paybill/till number
 * @param passkey - Your shortcode passkey
 * @param timestamp - Timestamp in format YYYYMMDDHHmmss
 * @returns Base64 encoded password
 */
export function generateStkPassword(
  shortcode: string,
  passkey: string,
  timestamp: string
): string {
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  return password;
}

/**
 * Generate STK Push access token using app credentials
 * @param consumerKey - Your Daraja app consumer key
 * @param consumerSecret - Your Daraja app consumer secret
 * @returns Access token string
 */
export async function generateAccessToken(
  consumerKey: string,
  consumerSecret: string
): Promise<string> {
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Initiate STK Push
 * @param phoneNumber - Customer phone number (2547xxxxxxxx)
 * @param amount - Amount to charge
 * @param shortcode - Your paybill/till number
 * @param passkey - Your shortcode passkey
 * @param callbackUrl - Your callback URL
 * @param accountReference - Account reference
 * @param transactionDesc - Transaction description
 * @returns STK push response
 */
export async function initiateStkPush({
  phoneNumber,
  amount,
  shortcode,
  passkey,
  callbackUrl,
  accountReference = "SBC Payment",
  transactionDesc = "Payment to SBC",
}: {
  phoneNumber: string;
  amount: number;
  shortcode: string;
  passkey: string;
  callbackUrl: string;
  accountReference?: string;
  transactionDesc?: string;
}) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);

  const password = generateStkPassword(shortcode, passkey, timestamp);
  const token = await generateAccessToken(
    process.env.MPESA_CONSUMER_KEY!,
    process.env.MPESA_CONSUMER_SECRET!
  );

  const response = await fetch(
    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      }),
    }
  );

  return await response.json();
}