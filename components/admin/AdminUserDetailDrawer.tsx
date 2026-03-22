"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  Clock,
  ExternalLink,
  FileText,
  RotateCcw,
  User,
  X,
} from "lucide-react";
import type { AdminPlanType, AdminUserDetail } from "@/lib/admin/types";
import { formatDate, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PLAN_OPTIONS: AdminPlanType[] = ["free", "trial", "monthly", "annual", "founder"];

const SUB_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "border-green-500/20 bg-green-500/10 text-green-700" },
  cancelled: { label: "Cancelled", className: "border-amber-500/20 bg-amber-500/10 text-amber-700" },
  past_due: { label: "Past due", className: "border-red-500/20 bg-red-500/10 text-red-700" },
  expired: { label: "Expired", className: "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-foreground)]" },
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return formatDate(value, "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isBanned(bannedUntil: string | null) {
  return Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
}

function isTrialActive(trialExpiresAt: string | null) {
  return Boolean(trialExpiresAt && new Date(trialExpiresAt).getTime() > Date.now());
}

interface AdminUserDetailDrawerProps {
  userId: string;
  onClose: () => void;
  onPlanChange: (userId: string, plan: AdminPlanType) => Promise<void>;
  onTrialExtend: (userId: string) => Promise<void>;
  onBan: (userId: string) => void;
  onResetBan: (userId: string) => Promise<void>;
}

export function AdminUserDetailDrawer({
  userId,
  onClose,
  onPlanChange,
  onTrialExtend,
  onBan,
  onResetBan,
}: AdminUserDetailDrawerProps) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
        const payload = (await res.json()) as { ok: boolean; data?: AdminUserDetail; error?: string };

        if (!cancelled) {
          if (!res.ok || !payload.ok || !payload.data) {
            setError(payload.error ?? "Could not load user.");
          } else {
            setDetail(payload.data);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load user detail.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const banned = isBanned(detail?.bannedUntil ?? null);

  async function handlePlanChange(plan: AdminPlanType) {
    setActionLoading(true);
    try {
      await onPlanChange(userId, plan);
      // Reload detail after action
      const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; data?: AdminUserDetail };
      if (payload.ok && payload.data) setDetail(payload.data);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTrialExtend() {
    setActionLoading(true);
    try {
      await onTrialExtend(userId);
      const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; data?: AdminUserDetail };
      if (payload.ok && payload.data) setDetail(payload.data);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetBan() {
    setActionLoading(true);
    try {
      await onResetBan(userId);
      const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; data?: AdminUserDetail };
      if (payload.ok && payload.data) setDetail(payload.data);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-label="User detail"
        className="fixed inset-y-0 end-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto bg-[var(--background)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-base font-semibold text-[var(--text-strong)]">User detail</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius)] p-1 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 px-5 py-5">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-[var(--surface-muted)]" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[var(--radius)] border border-[var(--destructive)]/30 bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-foreground)]">
              {error}
            </div>
          ) : detail ? (
            <>
              {/* Identity */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Identity</h3>
                <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)]">
                  <dl className="divide-y divide-[var(--border)]">
                    <Row label="Name" value={detail.displayName} />
                    <Row label="Email" value={detail.email ?? "—"} />
                    <Row label="Phone" value={detail.phone ?? "—"} />
                    <Row label="Country" value={detail.country} />
                    <Row label="Language" value={detail.langPref ?? "—"} />
                    <Row label="User ID" value={<code className="text-xs">{detail.id}</code>} />
                    <Row
                      label="Joined"
                      value={formatDateTime(detail.joinedAt)}
                    />
                    {banned ? (
                      <Row
                        label="Banned until"
                        value={
                          <span className="text-[var(--destructive)]">
                            {formatDateTime(detail.bannedUntil)}
                          </span>
                        }
                      />
                    ) : null}
                  </dl>
                </div>
              </section>

              {/* Subscription */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Subscription</h3>
                <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)]">
                  <dl className="divide-y divide-[var(--border)]">
                    <Row
                      label="Plan"
                      value={
                        <span className="capitalize font-medium">{detail.subscriptionType}</span>
                      }
                    />
                    <Row
                      label="Sub status"
                      value={
                        detail.subscriptionStatus ? (
                          <Badge variant="outline" className={SUB_STATUS_BADGE[detail.subscriptionStatus]?.className ?? ""}>
                            {SUB_STATUS_BADGE[detail.subscriptionStatus]?.label ?? detail.subscriptionStatus}
                          </Badge>
                        ) : "—"
                      }
                    />
                    <Row
                      label="Trial expires"
                      value={
                        detail.trialExpiresAt ? (
                          <span className={isTrialActive(detail.trialExpiresAt) ? "text-green-700" : "text-[var(--muted-foreground)]"}>
                            {formatDateTime(detail.trialExpiresAt)}
                            {isTrialActive(detail.trialExpiresAt) ? " (active)" : " (ended)"}
                          </span>
                        ) : "—"
                      }
                    />
                    <Row label="Lifetime free used" value={String(detail.lifetimeFreeUsed)} />
                  </dl>
                </div>

                {/* Subscription history */}
                {detail.subscriptions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[var(--muted-foreground)]">Subscription history</p>
                    <div className="space-y-2">
                      {detail.subscriptions.map((sub) => (
                        <div
                          key={sub.id}
                          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium capitalize text-[var(--text-strong)]">
                              {sub.planType}
                            </span>
                            <Badge
                              variant="outline"
                              className={SUB_STATUS_BADGE[sub.status]?.className ?? ""}
                            >
                              {sub.status}
                            </Badge>
                          </div>
                          {sub.currentPeriodEnd ? (
                            <p className="mt-1 text-[var(--muted-foreground)]">
                              Period end: {formatDate(sub.currentPeriodEnd, "en", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          ) : null}
                          {sub.lsSubscriptionId ? (
                            <p className="mt-1 font-mono text-[var(--muted-foreground)]">
                              LS: {sub.lsSubscriptionId}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[var(--muted-foreground)]">
                            Created {formatDate(sub.createdAt, "en", { year: "numeric", month: "short", day: "numeric" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              {/* Usage */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Usage</h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={FileText}
                    label="Total summaries"
                    value={formatNumber(detail.summariesTotal)}
                  />
                  <StatCard
                    icon={Clock}
                    label="Last 30 days"
                    value={formatNumber(detail.summariesLast30Days)}
                  />
                </div>
                {detail.activityAt ? (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Last activity: {formatDateTime(detail.activityAt)}
                  </p>
                ) : null}
              </section>

              {/* Admin actions */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <div className="flex flex-wrap gap-1">
                    {PLAN_OPTIONS.map((plan) => (
                      <Button
                        key={plan}
                        type="button"
                        size="sm"
                        variant={detail.subscriptionType === plan ? "default" : "outline"}
                        disabled={actionLoading}
                        onClick={() => void handlePlanChange(plan)}
                      >
                        {plan}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => void handleTrialExtend()}
                  >
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    Extend trial +7d
                  </Button>
                  {banned ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={actionLoading}
                      onClick={() => void handleResetBan()}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Remove ban
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
                      disabled={actionLoading}
                      onClick={() => onBan(userId)}
                    >
                      <Ban className="mr-1.5 h-3.5 w-3.5" />
                      Ban 1 year
                    </Button>
                  )}
                </div>
              </section>

              {/* Admin audit history */}
              {detail.recentAuditLog.length > 0 ? (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Admin action history</h3>
                  <div className="space-y-2">
                    {detail.recentAuditLog.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[var(--text-strong)]">{entry.action}</span>
                          <span className="text-[var(--muted-foreground)]">{formatDateTime(entry.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-[var(--muted-foreground)]">
                          by {entry.adminUsername}
                          {entry.ip ? ` · ${entry.ip}` : ""}
                        </p>
                        {Object.keys(entry.details).length > 0 ? (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-[var(--primary)]">Details</summary>
                            <pre className="mt-1 overflow-x-auto text-[10px] text-[var(--muted-foreground)]">
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Admin action history</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">No admin actions recorded for this user.</p>
                </section>
              )}

              {/* External links */}
              <section className="space-y-2 border-t border-[var(--border)] pt-4">
                <a
                  href={`https://app.supabase.com/project/_/auth/users?search=${encodeURIComponent(detail.email ?? detail.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View in Supabase
                </a>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-start gap-2 px-4 py-2.5">
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="text-xs text-[var(--text-strong)]">{value}</dd>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-[var(--primary)]" />
      <div>
        <p className="text-lg font-bold text-[var(--text-strong)]">{value}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      </div>
    </div>
  );
}
