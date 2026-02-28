"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

type AccessState = {
  checked: boolean;
  hasAccess: boolean;
  isLoggedIn: boolean;
};

const COPY = {
  title: {
    en: "Subscription required",
    ar: "الاشتراك مطلوب",
  },
  body: {
    en: "You need an active plan or trial to open the app dashboard.",
    ar: "تحتاج إلى خطة نشطة أو فترة تجريبية لفتح لوحة التطبيق.",
  },
  cta: {
    en: "View plans",
    ar: "عرض الخطط",
  },
} satisfies Record<string, LocalizedCopy<string>>;

async function readAccessState(): Promise<AccessState> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { checked: true, hasAccess: false, isLoggedIn: false };
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, trial_expires_at")
        .eq("id", user.id)
        .single<{ plan: string | null; trial_expires_at: string | null }>();

      const hasAccess =
        ["monthly", "annual", "founder"].includes(profile?.plan ?? "") ||
        (!!profile?.trial_expires_at && new Date(profile.trial_expires_at) > new Date());

      return { checked: true, hasAccess, isLoggedIn: true };
    } catch {
      return { checked: true, hasAccess: false, isLoggedIn: true };
    }
  } catch {
    return { checked: true, hasAccess: false, isLoggedIn: false };
  }
}

interface GoToAppButtonProps {
  children: React.ReactNode;
  className?: string;
}

export function GoToAppButton({ children, className }: GoToAppButtonProps) {
  const router = useRouter();
  const { locale } = useLang();
  const [access, setAccess] = useState<AccessState>({
    checked: false,
    hasAccess: false,
    isLoggedIn: false,
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    readAccessState().then((nextAccess) => {
      if (mounted) setAccess(nextAccess);
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleClick() {
    const nextAccess = access.checked ? access : await readAccessState();

    if (!access.checked) {
      setAccess(nextAccess);
    }

    if (nextAccess.hasAccess) {
      router.push("/dashboard");
      return;
    }

    setOpen(true);
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen} title={pick(COPY.title, locale)}>
        <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-4">
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            {pick(COPY.body, locale)}
          </p>
          <Link
            href={access.isLoggedIn ? "/billing" : "/pricing"}
            className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
            onClick={() => setOpen(false)}
          >
            {pick(COPY.cta, locale)}
          </Link>
        </div>
      </Dialog>
    </>
  );
}
