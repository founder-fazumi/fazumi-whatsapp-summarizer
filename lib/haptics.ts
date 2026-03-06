/**
 * Haptic feedback via Vibration API.
 * Silently no-ops if the API is unavailable (iOS Safari, desktop).
 */
export function haptic(style: "light" | "medium" | "success" | "error"): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;

  const patterns: Record<string, number[]> = {
    light: [10],
    medium: [20],
    success: [30, 40, 30],
    error: [80, 40, 80],
  };

  navigator.vibrate(patterns[style] ?? [10]);
}
