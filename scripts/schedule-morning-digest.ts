/**
 * Sends the morning web-push digest for users whose saved timezone is currently 7:00 AM.
 * The digest pulls up to three summaries from the previous local day and sends one push
 * notification per eligible subscription.
 *
 * Required env vars:
 * - `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
 * - `SUPABASE_SERVICE_ROLE_KEY`
 * - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
 * - `VAPID_PRIVATE_KEY`
 * - Optional: `VAPID_SUBJECT` (defaults to `mailto:admin@fazumi.app`)
 *
 * Run:
 * - `pnpm push:morning-digest`
 *
 * Expected output:
 * - Prints a JSON object with digest counts such as `processedUsers`, `notifiedUsers`,
 *   `sentSubscriptions`, `skippedUsers`, `failedSubscriptions`, `staleRemoved`,
 *   `eligibleTimezones`, and `generatedAt`.
 */
import { sendMorningDigest } from "@/lib/push/server";

async function main() {
  const result = await sendMorningDigest();
  console.log(JSON.stringify(result, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
