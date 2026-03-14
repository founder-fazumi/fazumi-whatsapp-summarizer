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
