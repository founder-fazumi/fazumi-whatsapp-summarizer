"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useRef } from "react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type OutputLang = "en" | "ar";

const COPY = {
  noUrgentItems: {
    en: "No urgent items found. You're all caught up.",
    ar: "لا توجد بنود عاجلة. أنت على اطلاع بكل شيء.",
  },
  nothingUrgentMissed: {
    en: "Nothing urgent missed",
    ar: "لم يفتك شيء عاجل",
  },
  nothingElseUrgentDetected: {
    en: "Nothing else urgent detected",
    ar: "لم نرصد شيئًا عاجلًا آخر",
  },
  noActionItemsRequired: {
    en: "No action items required",
    ar: "لا توجد إجراءات مطلوبة",
  },
  paymentDeadlineDetected: {
    en: "Payment deadline detected",
    ar: "تم رصد موعد دفع",
  },
} satisfies Record<string, LocalizedCopy<string>>;

const DATE_SIGNAL_PATTERN = /\b(date|dated|due|deadline|exam|meeting|event|today|tomorrow|before|by)\b|تاريخ|موعد|اليوم|غد|غدا|قبل|اختبار|فعالية/i;
const PAYMENT_CORE_PATTERN = /\b(payment|fee|fees|pay|paid|tuition|invoice)\b|رسوم|دفع|سداد|استحقاق|قسط/i;

function CountText({ count }: { count: number }) {
  return (
    <span className="font-medium text-[var(--foreground)]">
      {formatNumber(count)}
    </span>
  );
}

function joinSegments(segments: ReactNode[]) {
  return segments.map((segment, index) => (
    <Fragment key={`segment-${index}`}>
      {index > 0 && <span aria-hidden="true" className="px-1.5">·</span>}
      {segment}
    </Fragment>
  ));
}

function actionItemLabel(count: number, outputLang: OutputLang) {
  if (outputLang === "ar") {
    if (count === 1) {
      return "بند إجراء";
    }

    if (count === 2) {
      return "بندي إجراء";
    }

    return "بنود إجراءات";
  }

  return count === 1 ? "action item" : "action items";
}

function detectedDateLabel(count: number, outputLang: OutputLang) {
  if (outputLang === "ar") {
    if (count === 1) {
      return "موعد";
    }

    if (count === 2) {
      return "موعدين";
    }

    return "مواعيد";
  }

  return count === 1 ? "date" : "dates";
}

function upcomingDateLabel(count: number, outputLang: OutputLang) {
  if (outputLang === "ar") {
    if (count === 1) {
      return "موعد قادم";
    }

    if (count === 2) {
      return "موعدين قادمين";
    }

    return "مواعيد قادمة";
  }

  return count === 1 ? "upcoming date" : "upcoming dates";
}

function buildActionItemsSegment(count: number, outputLang: OutputLang) {
  if (outputLang === "ar") {
    return (
      <>
        <span>عثرنا على </span>
        <CountText count={count} />
        <span> {actionItemLabel(count, outputLang)}</span>
      </>
    );
  }

  return (
    <>
      <CountText count={count} />
      <span> {actionItemLabel(count, outputLang)} found</span>
    </>
  );
}

function buildDetectedDatesSegment(count: number, outputLang: OutputLang) {
  if (outputLang === "ar") {
    return (
      <>
        <span>تم رصد </span>
        <CountText count={count} />
        <span> {detectedDateLabel(count, outputLang)}</span>
      </>
    );
  }

  return (
    <>
      <CountText count={count} />
      <span> {detectedDateLabel(count, outputLang)} detected</span>
    </>
  );
}

function buildUpcomingDatesSegment(count: number, outputLang: OutputLang) {
  if (outputLang === "ar") {
    return (
      <>
        <span>تم رصد </span>
        <CountText count={count} />
        <span> {upcomingDateLabel(count, outputLang)}</span>
      </>
    );
  }

  return (
    <>
      <CountText count={count} />
      <span> {upcomingDateLabel(count, outputLang)} found</span>
    </>
  );
}

export function StatusLine({
  summary,
  outputLang,
  className,
}: {
  summary: SummaryResult;
  outputLang: OutputLang;
  className?: string;
}) {
  const hasRequiredSections =
    Array.isArray(summary.action_items) &&
    Array.isArray(summary.important_dates);
  const actionItems = hasRequiredSections ? summary.action_items : [];
  const importantDates = hasRequiredSections ? summary.important_dates : [];
  const actionItemCount = actionItems.length;
  const importantDateCount = importantDates.length;
  const matchedActionDateSignals = actionItems.filter((item) => DATE_SIGNAL_PATTERN.test(item));
  const dateSignalCount = importantDateCount > 0 ? importantDateCount : matchedActionDateSignals.length;
  const paymentSignalTexts = [
    ...actionItems,
    ...importantDates.map((item) => [item.label, item.time, item.location].filter(Boolean).join(" ")),
  ];
  const hasPaymentSignal = paymentSignalTexts.some((item) => PAYMENT_CORE_PATTERN.test(item));
  const requiresAction = actionItemCount > 0 || hasPaymentSignal;
  const Icon = requiresAction ? AlertCircle : CheckCircle2;
  const statusVariant =
    actionItemCount > 0
      ? dateSignalCount > 0
        ? "actions_and_dates"
        : hasPaymentSignal
          ? "actions_and_payment"
          : "actions_only"
      : importantDateCount > 0
        ? "dates_only"
        : "all_clear";
  const trackingKey = `${summary.char_count}:${actionItemCount}:${importantDateCount}:${Number(hasPaymentSignal)}:${outputLang}`;
  const trackedKeyRef = useRef<string | null>(null);

  let segments: ReactNode[];

  if (actionItemCount > 0) {
    segments = [buildActionItemsSegment(actionItemCount, outputLang)];

    if (dateSignalCount > 0) {
      segments.push(buildDetectedDatesSegment(dateSignalCount, outputLang));
      segments.push(pick(COPY.nothingUrgentMissed, outputLang));
    } else if (!hasPaymentSignal) {
      segments.push(pick(COPY.nothingElseUrgentDetected, outputLang));
    }
  } else if (importantDateCount > 0) {
    segments = [
      buildUpcomingDatesSegment(importantDateCount, outputLang),
      pick(COPY.noActionItemsRequired, outputLang),
    ];
  } else {
    segments = [pick(COPY.noUrgentItems, outputLang)];
  }

  if (hasPaymentSignal && !(actionItemCount > 0 && dateSignalCount === 0)) {
    segments.push(pick(COPY.paymentDeadlineDetected, outputLang));
  }

  if (hasPaymentSignal && actionItemCount > 0 && dateSignalCount === 0) {
    segments = [
      buildActionItemsSegment(actionItemCount, outputLang),
      pick(COPY.paymentDeadlineDetected, outputLang),
    ];
  }

  useEffect(() => {
    if (!hasRequiredSections) {
      return;
    }

    if (trackedKeyRef.current === trackingKey) {
      return;
    }

    trackedKeyRef.current = trackingKey;
    trackEvent(AnalyticsEvents.STATUS_LINE_SHOWN, {
      locale: outputLang,
      status_variant: statusVariant,
      action_item_count: actionItemCount,
      important_date_count: importantDateCount,
      has_payment_signal: hasPaymentSignal,
    });
  }, [
    actionItemCount,
    hasPaymentSignal,
    hasRequiredSections,
    importantDateCount,
    outputLang,
    statusVariant,
    trackingKey,
  ]);

  if (!hasRequiredSections) {
    return null;
  }

  return (
    <div
      data-testid="summary-status-line"
      dir={outputLang === "ar" ? "rtl" : "ltr"}
      lang={outputLang}
      className={cn(
        "flex items-start gap-2 text-xs leading-6 text-[var(--muted-foreground)]",
        outputLang === "ar" && "font-arabic",
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
      <p className="min-w-0 flex-1">
        {joinSegments(segments)}
      </p>
    </div>
  );
}
