import { Cookie, ShieldCheck } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  {
    title: { en: "Cookies we use", ar: "ملفات الارتباط التي نستخدمها" },
    body: {
      en: "Fazumi currently relies on essential cookies and local browser storage for sessions, theme preference, and language preference.",
      ar: "يعتمد Fazumi حاليًا على ملفات ارتباط أساسية وتخزين المتصفح المحلي للجلسات وتفضيل السمة واللغة.",
    },
  },
  {
    title: { en: "Cookies we do not use", ar: "ملفات الارتباط التي لا نستخدمها" },
    body: {
      en: "This placeholder policy assumes no ad-tech, retargeting, or cross-site tracking cookies are active in the MVP experience.",
      ar: "تفترض هذه السياسة المبدئية عدم وجود ملفات ارتباط إعلانية أو لإعادة الاستهداف أو للتتبع عبر المواقع في تجربة MVP.",
    },
  },
  {
    title: { en: "Your choices", ar: "خياراتك" },
    body: {
      en: "You can clear cookies or local storage from your browser settings at any time. Doing so may sign you out and reset your saved preferences.",
      ar: "يمكنك مسح ملفات الارتباط أو التخزين المحلي من إعدادات المتصفح في أي وقت. قد يؤدي ذلك إلى تسجيل خروجك وإعادة ضبط تفضيلاتك المحفوظة.",
    },
  },
] as const;

export default function CookiePolicyPage() {
  return (
    <PublicPageShell
      eyebrow={{ en: "Policy", ar: "سياسة" }}
      title={{ en: "Cookie Policy", ar: "سياسة ملفات الارتباط" }}
      description={{ en: "A placeholder summary of the small amount of browser-side storage used by Fazumi today.", ar: "ملخص مبدئي لكمية التخزين المحدودة على جانب المتصفح التي يستخدمها Fazumi حاليًا." }}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {SECTIONS.map((section, index) => {
          const Icon = index === 0 ? Cookie : ShieldCheck;

          return (
            <Card key={section.title.en}>
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>
                  <LocalizedText en={section.title.en} ar={section.title.ar} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  <LocalizedText en={section.body.en} ar={section.body.ar} />
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PublicPageShell>
  );
}
