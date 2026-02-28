import { ArrowUpCircle, CreditCard, Shield } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";

export function CheckoutTeaser() {
  return (
    <section className="py-12 bg-[var(--background)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[var(--shadow-card)]">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-64 bg-white/5 [clip-path:polygon(30%_0,100%_0,100%_100%,0%_100%)]" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpCircle className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-sm">
                <LocalizedText en="Unlock unlimited summaries" ar="افتح الملخصات غير المحدودة" />
              </p>
            </div>
            <p className="text-white/80 text-xs leading-relaxed">
              <LocalizedText
                en="You're on the free plan. 3 summaries remaining. Upgrade to get unlimited access, calendar sync, and Arabic output."
                ar="أنت على الخطة المجانية. تبقّت 3 ملخصات. قم بالترقية للحصول على وصول غير محدود ومزامنة التقويم والإخراج العربي."
              />
            </p>
          </div>
          <button
            disabled
            title="Coming soon"
            className="shrink-0 rounded-[var(--radius)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--primary)] hover:bg-white/90 transition-colors disabled:opacity-80 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <LocalizedText en="Upgrade now" ar="قم بالترقية الآن" />
          </button>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">
              <LocalizedText en="Complete your upgrade" ar="أكمل عملية الترقية" />
            </h3>
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
              <LocalizedText en="UI preview only" ar="معاينة للواجهة فقط" />
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">
                <LocalizedText en="Selected plan" ar="الخطة المحددة" />
              </label>
              <div className="flex gap-3">
                {[
                  { en: "Monthly · $9.99", ar: "شهري · $9.99" },
                  { en: "Annual · $99.99 (save 17%)", ar: "سنوي · $99.99 (وفّر 17%)" },
                ].map((plan) => (
                  <label key={plan.en} className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs cursor-pointer hover:border-[var(--primary)] transition-colors">
                    <input type="radio" name="plan" disabled className="accent-[var(--primary)]" />
                    <LocalizedText en={plan.en} ar={plan.ar} />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">
                <LocalizedText en="Full name" ar="الاسم الكامل" />
              </label>
              <input disabled placeholder="Aisha Al Mansoori" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">
                <LocalizedText en="Email" ar="البريد الإلكتروني" />
              </label>
              <input type="email" disabled placeholder="aisha@example.com" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">
                <LocalizedText en="Card number" ar="رقم البطاقة" />
              </label>
              <input disabled placeholder="4242 4242 4242 4242" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">
                <LocalizedText en="Expiry" ar="الانتهاء" />
              </label>
              <input disabled placeholder="MM / YY" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted-foreground)] block mb-1.5">
                <LocalizedText en="CVV" ar="CVV" />
              </label>
              <input disabled placeholder="•••" className="w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
            </div>
          </div>

          <button disabled className="mt-5 w-full rounded-[var(--radius)] bg-[var(--primary)] py-3 text-sm font-bold text-white disabled:opacity-60 disabled:cursor-not-allowed">
            <LocalizedText en="Pay now. Integration coming soon." ar="ادفع الآن. التكامل قادم قريبًا." />
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
            <Shield className="h-3.5 w-3.5" />
            <LocalizedText en="Secure checkout · 7-day money-back on monthly &amp; annual · Founder is final" ar="دفع آمن · ضمان استرداد 7 أيام على الشهري والسنوي · خطة المؤسس نهائية" />
          </div>
        </div>
      </div>
    </section>
  );
}
