"use client";

import { useEffect } from "react";
import { useConsentManager } from "@/components/compliance/ConsentManager";
import { createClient } from "@/lib/supabase/client";
import { identifyUser, resetAnalytics } from "@/lib/analytics";

export function AnalyticsIdentity() {
  const { consent, isReady } = useConsentManager();
  const analyticsAllowed = isReady && (consent.analytics || consent.sessionReplay);

  useEffect(() => {
    if (!analyticsAllowed) {
      resetAnalytics();
      return;
    }

    let active = true;
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      supabase = createClient();
    } catch {
      return;
    }

    async function syncIdentity() {
      if (!supabase) {
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!active) {
        return;
      }

      const user = data.user;
      if (user) {
        identifyUser(user.id, {
          email: user.email ?? null,
        });
        return;
      }

      resetAnalytics();
    }

    void syncIdentity();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;

      if (user) {
        identifyUser(user.id, {
          email: user.email ?? null,
        });
        return;
      }

      resetAnalytics();
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [analyticsAllowed]);

  return null;
}
