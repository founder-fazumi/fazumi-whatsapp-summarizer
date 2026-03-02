"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";

interface Props {
  summaryId: string;
}

export function DeleteSummaryButton({ summaryId }: Props) {
  const router = useRouter();
  const { locale } = useLang();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/summaries/${summaryId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Could not delete summary.");
      }

      router.push("/history");
      router.refresh();
    } catch {
      setError(locale === "ar" ? "تعذر حذف الملخص. حاول مرة أخرى." : "Could not delete the summary. Try again.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--muted-foreground)]">{locale === "ar" ? "حذف؟" : "Delete?"}</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded-[var(--radius-sm)] bg-[var(--destructive)] px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-50"
        >
          {loading ? (locale === "ar" ? "جارٍ الحذف…" : "Deleting…") : (locale === "ar" ? "نعم، احذف" : "Yes, delete")}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1.5 text-xs hover:bg-[var(--surface-muted)]"
        >
          {locale === "ar" ? "إلغاء" : "Cancel"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {locale === "ar" ? "حذف" : "Delete"}
      </button>
      {error && (
        <p className="text-xs text-[var(--destructive)]">{error}</p>
      )}
    </div>
  );
}
