"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type {
  AdminFeedbackRow,
  AdminInboxPriority,
  AdminSupportRequestRow,
  AdminSupportStatus,
} from "@/lib/admin/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AdminInboxItemPanelProps {
  item: AdminFeedbackRow | AdminSupportRequestRow;
  kind: "feedback" | "support";
  locale?: "en" | "ar";
  onSave: (updates: {
    status?: string;
    priority?: string;
    tags?: string[];
    adminNotes?: string;
  }) => Promise<void>;
  onClose?: () => void;
}

const STATUS_OPTIONS: AdminSupportStatus[] = ["new", "in_progress", "resolved", "closed"];
const PRIORITY_OPTIONS: Array<{
  value: AdminInboxPriority;
  color: string;
}> = [
  { value: "low", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  { value: "normal", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { value: "high", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { value: "critical", color: "bg-red-500/10 text-red-600 border-red-500/20" },
];
const TAG_OPTIONS = ["bug", "feature", "billing", "ux", "urgent", "arabic", "positive"] as const;

const STATUS_COPY: Record<AdminSupportStatus, { en: string; ar: string }> = {
  new: { en: "New", ar: "جديد" },
  in_progress: { en: "In progress", ar: "قيد المتابعة" },
  resolved: { en: "Resolved", ar: "تم الحل" },
  closed: { en: "Closed", ar: "مغلق" },
};

const PRIORITY_COPY: Record<AdminInboxPriority, { en: string; ar: string }> = {
  low: { en: "Low", ar: "منخفض" },
  normal: { en: "Normal", ar: "عادي" },
  high: { en: "High", ar: "مرتفع" },
  critical: { en: "Critical", ar: "حرج" },
};

const TAG_COPY: Record<(typeof TAG_OPTIONS)[number], { en: string; ar: string }> = {
  bug: { en: "Bug", ar: "خلل" },
  feature: { en: "Feature", ar: "ميزة" },
  billing: { en: "Billing", ar: "فواتير" },
  ux: { en: "UX", ar: "تجربة المستخدم" },
  urgent: { en: "Urgent", ar: "عاجل" },
  arabic: { en: "Arabic", ar: "العربية" },
  positive: { en: "Positive", ar: "إيجابي" },
};

function sortTags(tags: string[]) {
  return [...tags].sort((left, right) => left.localeCompare(right));
}

function statusLabel(value: AdminSupportStatus, locale: "en" | "ar") {
  return STATUS_COPY[value][locale];
}

function priorityLabel(value: AdminInboxPriority, locale: "en" | "ar") {
  return PRIORITY_COPY[value][locale];
}

function tagLabel(value: (typeof TAG_OPTIONS)[number], locale: "en" | "ar") {
  return TAG_COPY[value][locale];
}

export function AdminInboxItemPanel({
  item,
  kind,
  locale = "en",
  onSave,
  onClose,
}: AdminInboxItemPanelProps) {
  const [status, setStatus] = useState<AdminSupportStatus>(item.status);
  const [priority, setPriority] = useState<AdminInboxPriority>(item.priority);
  const [tags, setTags] = useState<string[]>(item.tags);
  const [adminNotes, setAdminNotes] = useState(item.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStatus(item.status);
    setPriority(item.priority);
    setTags(item.tags);
    setAdminNotes(item.adminNotes ?? "");
    setSaving(false);
    setSaved(false);
    setIsDirty(false);

    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = null;
    }
  }, [item.id, item.adminNotes, item.priority, item.status, item.tags]);

  useEffect(() => {
    const baseTags = sortTags(item.tags);
    const nextTags = sortTags(tags);
    const dirty =
      status !== item.status ||
      priority !== item.priority ||
      adminNotes !== (item.adminNotes ?? "") ||
      baseTags.length !== nextTags.length ||
      baseTags.some((tag, index) => tag !== nextTags[index]);

    setIsDirty(dirty);
  }, [adminNotes, item.adminNotes, item.priority, item.status, item.tags, priority, status, tags]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  const message = item.message ?? "";
  const contact = item.email ?? item.phone ?? item.userId ?? "";

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      className={cn(
        "flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-card)]",
        locale === "ar" && "font-arabic"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            {kind === "feedback"
              ? locale === "ar"
                ? "ملاحظة"
                : "Feedback"
              : locale === "ar"
              ? "طلب دعم"
              : "Support"}
          </p>
          <p className="mt-1 text-sm text-[var(--foreground)]">{message}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{contact}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={locale === "ar" ? "إغلاق" : "Close"}
            className="rounded-full p-1 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <Accordion type="single" collapsible defaultValue="status" className="-space-y-px">
        <AccordionItem
          value="status"
          className="overflow-hidden border border-[var(--border)] bg-[var(--surface-muted)] px-4 first:rounded-t-[var(--radius)] last:rounded-b-[var(--radius)]"
        >
          <AccordionTrigger className="text-sm font-medium">
            {locale === "ar" ? "الحالة والأولوية" : "Status & Priority"}
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pb-4">
            <div>
              <label className="mb-1 block text-xs text-[var(--muted-foreground)]">
                {locale === "ar" ? "الحالة" : "Status"}
              </label>
              <Select value={status} onValueChange={(value) => setStatus(value as AdminSupportStatus)}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((statusValue) => (
                    <SelectItem key={statusValue} value={statusValue}>
                      {statusLabel(statusValue, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-xs text-[var(--muted-foreground)]">
                {locale === "ar" ? "الأولوية" : "Priority"}
              </label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map(({ value, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriority(value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                      color,
                      priority === value
                        ? "ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface-muted)]"
                        : "opacity-60 hover:opacity-100"
                    )}
                  >
                    {priorityLabel(value, locale)}
                  </button>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="tags"
          className="overflow-hidden border border-[var(--border)] bg-[var(--surface-muted)] px-4 first:rounded-t-[var(--radius)] last:rounded-b-[var(--radius)]"
        >
          <AccordionTrigger className="text-sm font-medium">
            {locale === "ar" ? "الوسوم" : "Tags"}
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setTags((current) =>
                      current.includes(tag)
                        ? current.filter((entry) => entry !== tag)
                        : [...current, tag]
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    tags.includes(tag)
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]"
                  )}
                >
                  {tagLabel(tag, locale)}
                </button>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="notes"
          className="overflow-hidden border border-[var(--border)] bg-[var(--surface-muted)] px-4 first:rounded-t-[var(--radius)] last:rounded-b-[var(--radius)]"
        >
          <AccordionTrigger className="text-sm font-medium">
            {locale === "ar" ? "ملاحظات المشرف" : "Admin Notes"}
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <Textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value.slice(0, 4000))}
              placeholder={locale === "ar" ? "أضف ملاحظاتك هنا…" : "Add your notes here…"}
              rows={4}
              className="text-sm"
              dir={locale === "ar" ? "rtl" : "ltr"}
            />
            <p className="mt-1 text-right text-xs text-[var(--muted-foreground)]">
              {adminNotes.length} / 4000
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex items-center justify-end gap-2">
        {saved ? (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3.5 w-3.5" />
            {locale === "ar" ? "تم الحفظ" : "Saved"}
          </span>
        ) : null}
        <Button
          size="sm"
          disabled={!isDirty || saving}
          onClick={async () => {
            setSaving(true);

            try {
              await onSave({
                status,
                priority,
                tags,
                adminNotes,
              });
              setIsDirty(false);
              setSaved(true);

              if (savedTimeoutRef.current) {
                clearTimeout(savedTimeoutRef.current);
              }

              savedTimeoutRef.current = setTimeout(() => {
                setSaved(false);
                savedTimeoutRef.current = null;
              }, 3000);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving
            ? locale === "ar"
              ? "جارٍ الحفظ…"
              : "Saving…"
            : locale === "ar"
            ? "حفظ"
            : "Save"}
        </Button>
      </div>
    </div>
  );
}
