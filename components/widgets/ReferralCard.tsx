import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReferralCard() {
  return (
    <Card className="bg-gradient-to-br from-[var(--accent-cream)]/20 to-[var(--card)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Share Fazumi with another parent 🎁
        </CardTitle>
        <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
          You both get <strong>+1 free summary</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Family illustration placeholder */}
        <div className="flex items-center justify-center rounded-[var(--radius)] bg-[var(--accent-cream)]/30 py-3 text-4xl select-none">
          👨‍👩‍👧
        </div>

        <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--muted-foreground)] font-mono text-center">
          fazumi.com/ref/your-code
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          disabled
        >
          Copy Link (coming soon)
        </Button>
      </CardContent>
    </Card>
  );
}
