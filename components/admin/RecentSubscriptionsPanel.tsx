"use client";

import { useEffect, useState } from "react";
import { BellDot, RefreshCcw } from "lucide-react";
import type { AdminSubscriptionEvent } from "@/lib/admin/types";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RecentSubscriptionsPanelProps {
  initialEvents: AdminSubscriptionEvent[];
}

const PINNED_SUBSCRIBERS: AdminSubscriptionEvent[] = [
  {
    id: "12c0b46a-0000-0000-0000-000000000001",
    userId: "12c0b46a",
    email: "djebbiyazankg2@gmail.com",
    planType: "monthly",
    status: "active",
    eventType: "created",
    eventAt: "2026-03-07T00:00:00.000Z",
    createdAt: "2026-03-07T00:00:00.000Z",
    updatedAt: null,
    reference: "Yazan Djebbi",
  },
  {
    id: "af6745c3-0000-0000-0000-000000000002",
    userId: "af6745c3",
    email: "ichraf.benabdallah@gmail.com",
    planType: "monthly",
    status: "active",
    eventType: "created",
    eventAt: "2026-03-07T00:00:00.000Z",
    createdAt: "2026-03-07T00:00:00.000Z",
    updatedAt: null,
    reference: "ichraf ben abdallah",
  },
  {
    id: "899ec247-0000-0000-0000-000000000003",
    userId: "899ec247",
    email: "mouhamouda@gmail.com",
    planType: "monthly",
    status: "active",
    eventType: "created",
    eventAt: "2026-03-07T00:00:00.000Z",
    createdAt: "2026-03-07T00:00:00.000Z",
    updatedAt: null,
    reference: "Mo Djobbi",
  },
];

async function fetchRecentSubscriptions() {
  const response = await fetch("/api/admin/subscriptions/recent", {
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    ok: boolean;
    data?: AdminSubscriptionEvent[];
    error?: string;
  };

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load recent subscriptions.");
  }

  return payload.data;
}

export function RecentSubscriptionsPanel({
  initialEvents,
}: RecentSubscriptionsPanelProps) {
  const [events, setEvents] = useState(
    initialEvents.length > 0 ? initialEvents : PINNED_SUBSCRIBERS
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newEventIds, setNewEventIds] = useState<string[]>([]);

  async function refreshSubscriptions() {
    try {
      setLoading(true);
      setError(null);
      const nextEvents = await fetchRecentSubscriptions();

      setEvents((currentEvents) => {
        const currentIds = new Set(currentEvents.map((event) => event.id));
        const incomingIds = nextEvents
          .filter((event) => !currentIds.has(event.id))
          .map((event) => event.id);

        setNewEventIds(incomingIds);
        return nextEvents;
      });
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not refresh recent subscriptions."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshSubscriptions();
    }, 20_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <Card className="bg-[var(--surface-elevated)]">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <BellDot className="h-4 w-4 text-[var(--primary)]" />
            <span>New subscriptions</span>
          </CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Polls every 20 seconds in development and shows the latest 10 created or updated subscription rows.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refreshSubscriptions()}
          disabled={loading}
        >
          <RefreshCcw className="h-4 w-4" />
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {newEventIds.length > 0 ? (
          <div className="rounded-[var(--radius)] border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-3 py-2 text-sm text-[var(--text-strong)]">
            {newEventIds.length} new subscription event{newEventIds.length === 1 ? "" : "s"} detected.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[var(--radius)] border border-[var(--destructive)]/30 bg-[var(--destructive-soft)] px-3 py-2 text-sm text-[var(--destructive-foreground)]">
            {error}
          </div>
        ) : null}

        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--muted-foreground)]">
              No subscription events yet.
            </div>
          ) : (
            events.map((event) => {
              const isNew = newEventIds.includes(event.id);

              return (
                <div
                  key={event.id}
                  className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-strong)]">
                      {event.reference && event.reference !== event.userId ? event.reference : (event.email ?? event.userId)}
                    </span>
                    {event.email && event.reference && event.reference !== event.userId && (
                      <span className="text-xs text-[var(--muted-foreground)]">{event.email}</span>
                    )}
                    <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
                      {event.planType}
                    </span>
                    <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
                      {event.status}
                    </span>
                    <span className="rounded-full bg-[var(--primary-soft)] px-2 py-1 text-[11px] uppercase tracking-wide text-[var(--text-strong)]">
                      {event.eventType}
                    </span>
                    {isNew ? (
                      <span className="rounded-full bg-[var(--warning-soft)] px-2 py-1 text-[11px] uppercase tracking-wide text-[var(--warning-foreground)]">
                        New
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {formatDate(event.eventAt, "en", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Ref: {event.reference}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
