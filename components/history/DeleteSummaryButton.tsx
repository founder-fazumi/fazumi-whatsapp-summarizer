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

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/summaries/${summaryId}`, { method: "DELETE" });
      router.push("/history");
      router.refresh();
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
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {locale === "ar" ? "حذف" : "Delete"}
    </button>
  );
}
