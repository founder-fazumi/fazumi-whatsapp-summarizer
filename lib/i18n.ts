export type Locale = "en" | "ar";

const labels: Record<string, Record<Locale, string>> = {
  // ── Navigation ────────────────────────────────────────────────
  "nav.dashboard":     { en: "Dashboard",            ar: "الرئيسية" },
  "nav.summarize":     { en: "Summarize",             ar: "تلخيص" },
  "nav.history":       { en: "History",               ar: "السجل" },
  "nav.calendar":      { en: "Calendar",              ar: "التقويم" },
  "nav.todo":          { en: "To-Do",                 ar: "المهام" },
  "nav.resources":     { en: "Help & Resources",      ar: "المساعدة" },
  "nav.settings":      { en: "Settings",              ar: "الإعدادات" },
  "nav.billing":       { en: "Billing",               ar: "الفواتير" },
  "nav.profile":       { en: "Profile",               ar: "الملف الشخصي" },
  "nav.help":          { en: "Help & Feedback",       ar: "المساعدة والملاحظات" },
  "nav.signout":       { en: "Sign out",              ar: "تسجيل الخروج" },
  "nav.upgrade":       { en: "Upgrade",               ar: "ترقية الخطة" },
  // ── Auth ──────────────────────────────────────────────────────
  "auth.login":        { en: "Log in",                ar: "تسجيل الدخول" },
  "auth.signup":       { en: "Sign up",               ar: "إنشاء حساب" },
  "auth.email":        { en: "Email",                 ar: "البريد الإلكتروني" },
  "auth.password":     { en: "Password",              ar: "كلمة المرور" },
  "auth.name":         { en: "Full name",             ar: "الاسم الكامل" },
  "auth.google":       { en: "Continue with Google",  ar: "المتابعة عبر Google" },
  "auth.apple":        { en: "Continue with Apple",   ar: "المتابعة عبر Apple" },
  "auth.or":           { en: "or",                    ar: "أو" },
  // ── Dashboard ─────────────────────────────────────────────────
  "dash.greeting":     { en: "Good morning",          ar: "صباح الخير" },
  "dash.trial.days":   { en: "days left in trial",    ar: "أيام متبقية في الفترة التجريبية" },
  "dash.trial.badge":  { en: "Free Trial",            ar: "فترة تجريبية" },
  "dash.free.badge":   { en: "Free",                  ar: "مجاني" },
  "dash.paid.badge":   { en: "Pro",                   ar: "احترافي" },
  "dash.upgrade":      { en: "Upgrade",               ar: "ترقية الخطة" },
  "dash.summaries":    { en: "Today's Summaries",     ar: "ملخصات اليوم" },
  // ── TopBar ────────────────────────────────────────────────────
  "topbar.search":     { en: "Search messages, tasks, dates…", ar: "ابحث في الرسائل والمهام والتواريخ…" },
  "topbar.notif":      { en: "Notifications",         ar: "الإشعارات" },
  // ── Settings ──────────────────────────────────────────────────
  "settings.theme":    { en: "Appearance",            ar: "المظهر" },
  "settings.lang":     { en: "Language",              ar: "اللغة" },
  "settings.light":    { en: "Light",                 ar: "فاتح" },
  "settings.dark":     { en: "Dark",                  ar: "داكن" },
  "settings.english":  { en: "English",               ar: "English" },
  "settings.arabic":   { en: "Arabic",                ar: "العربية" },
  "settings.saved":    { en: "Saved",                 ar: "تم الحفظ" },
  // ── Legal ─────────────────────────────────────────────────────
  "legal.privacy":     { en: "Privacy Policy",        ar: "سياسة الخصوصية" },
  "legal.terms":       { en: "Terms of Service",      ar: "شروط الخدمة" },
  "legal.refunds":     { en: "Refund Policy",         ar: "سياسة الاسترداد" },
};

export function t(key: string, locale: Locale = "en"): string {
  return labels[key]?.[locale] ?? labels[key]?.["en"] ?? key;
}
