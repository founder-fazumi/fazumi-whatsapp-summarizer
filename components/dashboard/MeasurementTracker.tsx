"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";

const DAY_MS = 24 * 60 * 60 * 1000;

export function MeasurementTracker() {
  useEffect(() => {
    let active = true;

    async function trackGrowthSignals() {
      let supabase: ReturnType<typeof createClient>;

      try {
        supabase = createClient();
      } catch {
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) {
        return;
      }

      const { data, error } = await supabase
        .from("summaries")
        .select("created_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error || !active) {
        return;
      }

      const rows = ((data ?? []) as Array<{ created_at: string }>).filter((row) => row.created_at);
      if (rows.length === 0) {
        return;
      }

      const activationKey = `fazumi-activation:${user.id}`;
      if (!window.localStorage.getItem(activationKey)) {
        trackEvent(AnalyticsEvents.ACTIVATION_COMPLETED, {
          firstSummaryAt: rows[0].created_at,
          lifetimeSummaryCount: rows.length,
        });
        window.localStorage.setItem(activationKey, rows[0].created_at);
      }

      const now = Date.now();
      const recentCount = rows.filter((row) => now - new Date(row.created_at).getTime() <= 7 * DAY_MS).length;
      const hasOlderSummary = rows.some((row) => now - new Date(row.created_at).getTime() > 7 * DAY_MS);

      if (!hasOlderSummary || recentCount === 0) {
        return;
      }

      const repeatKey = `fazumi-weekly-repeat:${user.id}:${Math.floor(now / (7 * DAY_MS))}`;
      if (!window.localStorage.getItem(repeatKey)) {
        trackEvent(AnalyticsEvents.WEEKLY_REPEAT_USED, {
          recentSummaryCount: recentCount,
          lifetimeSummaryCount: rows.length,
        });
        window.localStorage.setItem(repeatKey, String(now));
      }
    }

    void trackGrowthSignals();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
