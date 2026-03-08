export type Locale = "en" | "ar";
export type LocalizedCopy<T = string> = Record<Locale, T>;

const labels: Record<string, Record<Locale, string>> = {
  // ── Navigation ────────────────────────────────────────────────
  "nav.dashboard":     { en: "Dashboard",            ar: "الرئيسية" },
  "nav.summarize":     { en: "Summarize",             ar: "تلخيص" },
  "nav.history":       { en: "History",               ar: "السجل" },
  "nav.calendar":      { en: "Calendar",              ar: "التقويم" },
  "nav.todo":          { en: "To-Do",                 ar: "المهام" },
  "nav.resources":     { en: "Help & Resources",      ar: "المساعدة والمصادر" },
  "nav.settings":      { en: "Settings",              ar: "الإعدادات" },
  "nav.billing":       { en: "Billing",               ar: "الفوترة" },
  "nav.founder":       { en: "Founding Supporter",    ar: "داعم مؤسس" },
  "nav.profile":       { en: "Profile",               ar: "الملف الشخصي" },
  "nav.help":          { en: "Help & Feedback",       ar: "المساعدة والمصادر" },
  "nav.faq":           { en: "FAQ",                   ar: "الأسئلة الشائعة" },
  "nav.contact":       { en: "Contact",               ar: "اتصل بنا" },
  "nav.signout":       { en: "Sign out",              ar: "تسجيل الخروج" },
  "nav.upgrade":       { en: "Upgrade",               ar: "ترقية الخطة" },
  // ── Auth ──────────────────────────────────────────────────────
  "auth.login":        { en: "Log in",                ar: "تسجيل الدخول" },
  "auth.signup":       { en: "Sign up",               ar: "إنشاء حساب" },
  "auth.email":        { en: "Email",                 ar: "البريد الإلكتروني" },
  "auth.password":     { en: "Password",              ar: "كلمة المرور" },
  "auth.password.requirement": { en: "Min 8 characters", ar: "٨ أحرف على الأقل" },
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
  "dashboard.name.placeholder": { en: "there",        ar: "عزيزي المستخدم" },
  "dashboard.usage.label": { en: "Usage today",       ar: "ملخصات اليوم" },
  // ── TopBar ────────────────────────────────────────────────────
  "topbar.search":     { en: "Search messages, tasks, dates…", ar: "ابحث في الرسائل والمهام والتواريخ…" },
  "topbar.notif":      { en: "Notifications",         ar: "الإشعارات" },
  // ── Actions & Greetings ──────────────────────────────────────
  "action.upgrade":    { en: "Upgrade",               ar: "ترقية الخطة" },
  "greeting.morning":  { en: "Good morning",          ar: "صباح الخير" },
  "greeting.afternoon": { en: "Good afternoon",       ar: "نهارك سعيد" },
  "greeting.evening":  { en: "Good evening",          ar: "مساء الخير" },
  // ── Pricing ───────────────────────────────────────────────────
  "plan.founder":      { en: "Founder",               ar: "باقة المؤسسين" },
  "plan.founder.badge": { en: "Founding Supporter",   ar: "عضو مؤسس" },
  "plan.founder.cta":  { en: "Claim founder access",  ar: "احصل على وصول المؤسس" },
  "plan.founder.feature.badge": { en: "Founding Supporter badge", ar: "شارة العضو المؤسس" },
  "plan.founder.feature.community": { en: "Private WhatsApp group", ar: "مجموعة واتساب خاصة" },
  "pricing.billed.annually": { en: "billed annually", ar: "تُدفع سنويًا" },
  "pricing.refund.founder": { en: "Founder is final", ar: "العضوية المؤسسية نهائية — لا استرداد" },
  // ── Contact ───────────────────────────────────────────────────
  "contact.title":     { en: "Contact us",            ar: "اتصل بنا" },
  "contact.subtitle":  { en: "We're here to help",    ar: "نحن هنا للمساعدة" },
  "contact.support":   { en: "Support",               ar: "الدعم الفني" },
  "contact.name.label": { en: "Full name",            ar: "الاسم الكامل" },
  "contact.message.label": { en: "Message",           ar: "الرسالة" },
  // ── Help ──────────────────────────────────────────────────────
  "help.contact.subtitle": { en: "Still need help?",  ar: "هل لا تزال تحتاج مساعدة؟" },
  "help.contact.cta":  { en: "Contact Support",       ar: "اتصل بالدعم الفني" },
  // ── Sidebar ───────────────────────────────────────────────────
  "sidebar.brand.sub": { en: "School chat. Clear plan.", ar: "محادثات المدرسة، وخطة واضحة." },
  "sidebar.nav.help":  { en: "Help & Resources",      ar: "المساعدة والمصادر" },
  "sidebar.premium":   { en: "Get Premium",           ar: "احصل على العضوية المميزة" },
  "sidebar.priority.support": { en: "Priority support", ar: "دعم ذو أولوية" },
  // ── Settings ──────────────────────────────────────────────────
  "settings.theme":         { en: "Appearance",                        ar: "المظهر" },
  "settings.theme.desc":    { en: "Choose your preferred color scheme.", ar: "اختر نظام الألوان المفضل لديك." },
  "settings.lang":          { en: "Language",                           ar: "اللغة" },
  "settings.lang.desc":     { en: "Switch the app between English and Arabic (RTL).", ar: "بدّل التطبيق بين العربية والإنجليزية." },
  "settings.light":         { en: "Light",                              ar: "فاتح" },
  "settings.dark":          { en: "Dark",                               ar: "داكن" },
  "settings.english":       { en: "English",                            ar: "الإنجليزية" },
  "settings.arabic":        { en: "Arabic",                             ar: "العربية" },
  "settings.saved":         { en: "Saved",                              ar: "تم الحفظ" },
  "settings.account":       { en: "Account",                            ar: "الحساب" },
  "settings.account.desc":  { en: "Manage your account and data.",      ar: "إدارة حسابك وبياناتك." },
  "settings.account.manage":{ en: "Account deletion and data export coming soon.", ar: "حذف الحساب وتصدير البيانات قريباً." },
  // ── Legal ─────────────────────────────────────────────────────
  "legal.privacy":     { en: "Privacy Policy",        ar: "سياسة الخصوصية" },
  "legal.terms":       { en: "Terms of Service",      ar: "شروط الخدمة" },
  "legal.refunds":     { en: "Refund Policy",         ar: "سياسة الاسترداد" },
};

export function t(key: string, locale: Locale = "en"): string {
  return labels[key]?.[locale] ?? labels[key]?.["en"] ?? key;
}

export function pick<T>(copy: LocalizedCopy<T>, locale: Locale): T {
  return copy[locale] ?? copy.en;
}

export function getTimeAwareGreeting(locale: Locale, date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) {
    return t("greeting.morning", locale);
  }

  if (hour < 17) {
    return t("greeting.afternoon", locale);
  }

  return t("greeting.evening", locale);
}
