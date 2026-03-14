import { createHmac, timingSafeEqual } from "crypto";

/**
 * Reject webhooks whose timestamp is more than 5 minutes from now.
 * Prevents replay of captured valid signatures.
 */
const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Verifies a Paddle webhook signature.
 *
 * Paddle sends:  Paddle-Signature: ts=<unix_seconds>;h1=<hmac_hex>
 * During secret rotation Paddle may send multiple h1 values:
 *   Paddle-Signature: ts=<unix_seconds>;h1=<old_hmac>;h1=<new_hmac>
 * Accept the request if ANY one h1 matches.
 *
 * HMAC is computed over the string "${ts}:${rawBody}" using HMAC-SHA256.
 */
export function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  // 1. Extract timestamp
  const tsMatch = signatureHeader.match(/ts=(\d+)/);
  if (!tsMatch) return false;
  const ts = tsMatch[1];

  // 2. Replay protection: reject if timestamp is outside tolerance window
  const tsSeconds = parseInt(ts, 10);
  if (!Number.isFinite(tsSeconds)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > SIGNATURE_TOLERANCE_SECONDS) return false;

  // 3. Extract ALL h1 values (handles key rotation where Paddle sends multiple)
  const h1Values: string[] = [];
  const h1Regex = /h1=([a-f0-9]{64})/g;
  let match: RegExpExecArray | null;
  while ((match = h1Regex.exec(signatureHeader)) !== null) {
    h1Values.push(match[1]);
  }
  if (h1Values.length === 0) return false;

  // 4. Compute expected HMAC-SHA256 of "ts:rawBody"
  const expected = createHmac("sha256", secret)
    .update(`${ts}:${rawBody}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  // 5. Accept if any h1 matches — key-rotation safe
  return h1Values.some((h1) => {
    if (h1.length !== expected.length) return false;
    try {
      return timingSafeEqual(Buffer.from(h1, "hex"), expectedBuffer);
    } catch {
      return false;
    }
  });
}

// ── Checkout Session ─────────────────────────────────────────────────────────

/**
 * Creates a Paddle hosted checkout session and returns the checkout URL.
 *
 * Paddle's hosted checkout requires creating a session via their API.
 * The session URL is then used to redirect the customer to complete payment.
 *
 * @param priceId - Paddle price ID (e.g., pri_01abc...)
 * @param email - Customer email (prefills checkout form)
 * @param userId - Our user ID (stored in custom_data for webhook matching)
 * @param appUrl - App base URL for success/cancel redirects
 * @returns Checkout URL or null if API call fails
 */
interface CreateCheckoutSessionParams {
  priceId: string;
  email: string;
  userId: string;
  appUrl?: string;
}

export async function createPaddleCheckoutSession({
  priceId,
  email,
  userId,
  appUrl,
}: CreateCheckoutSessionParams): Promise<string | null> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return null;

  const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "production"
    ? "production"
    : "sandbox";

  const baseUrl = environment === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

  const appUrlOrDefault = appUrl ?? "https://fazumi.com";

  try {
    const res = await fetch(`${baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Paddle-Version": "1",
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer_email: email,
        custom_data: { user_id: userId },
        success_url: `${appUrlOrDefault}/dashboard?upgraded=1`,
        cancel_url: `${appUrlOrDefault}/pricing`,
      }),
    });

    if (!res.ok) {
      console.error("[paddle-checkout]", res.status, await res.text().catch(() => "unknown"));
      return null;
    }

    const json = (await res.json()) as { data?: { hosted_checkout_url?: string } };
    return json.data?.hosted_checkout_url ?? null;
  } catch (err) {
    console.error("[paddle-checkout]", err instanceof Error ? err.message : String(err));
    return null;
  }
}
