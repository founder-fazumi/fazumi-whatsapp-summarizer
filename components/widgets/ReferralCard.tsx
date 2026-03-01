"use client";

import Image from "next/image";
import { Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";

const COPY = {
  title: { en: "Share Fazumi with another parent", ar: "شارك Fazumi مع ولي أمر آخر" },
  subtitle: { en: "You both get +1 free summary", ar: "تحصلان معًا على +1 ملخص مجاني" },
  button: { en: "Copy Link (coming soon)", ar: "نسخ الرابط (قريبًا)" },
} satisfies Record<string, LocalizedCopy<string>>;

export function ReferralCard() {
  const { locale } = useLang();

  return (
    <Card className="bg-gradient-to-br from-[var(--accent-cream)]/20 to-[var(--card)]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Gift className="h-4 w-4 text-[var(--primary)]" />
          {pick(COPY.title, locale)}
        </CardTitle>
        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
          {pick(COPY.subtitle, locale)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-center rounded-[var(--radius)] bg-[var(--accent-cream)]/30 py-3">
          <Image src="/brand/mascot/mascot-waving.png.png" alt="" width={80} height={80} className="object-contain" />
        </div>

        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--card)] px-3 py-2 text-center font-mono text-xs text-[var(--muted-foreground)]">
          fazumi.com/ref/your-code
        </div>
        <Button variant="outline" size="sm" className="w-full text-xs" disabled>
          {pick(COPY.button, locale)}
        </Button>
      </CardContent>
    </Card>
  );
}
