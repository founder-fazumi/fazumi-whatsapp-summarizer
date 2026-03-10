/**
 * Sends the 7:00 AM web-push digest for users whose saved timezone is currently 7:00 AM.
 * Most days it summarizes the previous 7 days of saved school history, including
 * action-item totals and optional group-name context. On Sunday, it sends the weekly
 * progress recap instead of a second daily digest.
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
 *   `sentSubscriptions`, `weeklyNotifiedUsers`, `weeklySentSubscriptions`,
 *   `skippedUsers`, `failedSubscriptions`, `staleRemoved`, `eligibleTimezones`,
 *   and `generatedAt`.
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
