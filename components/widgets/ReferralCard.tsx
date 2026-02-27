import { Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReferralCard() {
  return (
    <Card className="bg-gradient-to-br from-[var(--muted)] to-[var(--card)]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Gift className="h-4 w-4 text-[var(--primary)]" />
          Refer a Friend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Invite a parent → they get <strong>7 days free</strong> and you get{" "}
          <strong>$3 off</strong> your next month.
        </p>
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
