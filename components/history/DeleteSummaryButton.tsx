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
          className="rounded px-2 py-1 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          {loading ? (locale === "ar" ? "جارٍ الحذف…" : "Deleting…") : (locale === "ar" ? "نعم، احذف" : "Yes, delete")}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded px-2 py-1 text-xs border border-[var(--border)] hover:bg-[var(--bg-2)] transition-colors"
        >
          {locale === "ar" ? "إلغاء" : "Cancel"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {locale === "ar" ? "حذف" : "Delete"}
    </button>
  );
}
