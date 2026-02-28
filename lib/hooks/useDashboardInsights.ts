"use client";

import { useEffect, useState } from "react";
import { buildDashboardInsights, EMPTY_DASHBOARD_INSIGHTS, type DashboardInsights, type SummaryInsightRow } from "@/lib/dashboard-insights";
import { createClient } from "@/lib/supabase/client";

const SUMMARY_SAVED_EVENT = "fazumi-summary-saved";

export function emitDashboardInsightsRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SUMMARY_SAVED_EVENT));
  }
}

export function useDashboardInsights(refreshKey?: number): DashboardInsights {
  const [insights, setInsights] = useState<DashboardInsights>(EMPTY_DASHBOARD_INSIGHTS);

  useEffect(() => {
    let mounted = true;

    async function loadInsights() {
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;

        if (!user) {
          if (mounted) setInsights(EMPTY_DASHBOARD_INSIGHTS);
          return;
        }

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from("summaries")
          .select("id, created_at, important_dates, action_items")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          throw error;
        }

        if (mounted) {
          setInsights(buildDashboardInsights((data as SummaryInsightRow[] | null) ?? []));
        }
      } catch {
        if (mounted) setInsights(EMPTY_DASHBOARD_INSIGHTS);
      }
    }

    void loadInsights();

    function handleRefresh() {
      void loadInsights();
    }

    window.addEventListener(SUMMARY_SAVED_EVENT, handleRefresh);

    return () => {
      mounted = false;
      window.removeEventListener(SUMMARY_SAVED_EVENT, handleRefresh);
    };
  }, [refreshKey]);

  return insights;
}
