// Internal dashboard UI locale — kept narrow so existing dashboard
// components don't require changes.
export type Locale = "en" | "ar";

// Website-facing locale — the full set served by the language switcher.
export type SiteLocale = "en" | "ar" | "es" | "pt-BR" | "id";

// en and ar are always required; new locales are optional and fall back to en.
export type LocalizedCopy<T = string> = { en: T; ar: T } & Partial<Record<Exclude<SiteLocale, "en" | "ar">, T>>;

/** Narrow a SiteLocale to the internal Locale, falling back to "en" for new locales. */
export function toLocale(sl: SiteLocale): Locale {
  return sl === "ar" ? "ar" : "en";
}

type LabelEntry = { en: string; ar: string } & Partial<Record<Exclude<SiteLocale, "en" | "ar">, string>>;

const labels: Record<string, LabelEntry> = {
  // ── Navigation ────────────────────────────────────────────────
  "nav.dashboard":     { en: "Dashboard",            ar: "الرئيسية",             es: "Panel principal",       "pt-BR": "Painel",            id: "Dasbor" },
  "nav.summarize":     { en: "Summarize",             ar: "تلخيص",               es: "Resumir",               "pt-BR": "Resumir",           id: "Rangkum" },
  "nav.history":       { en: "History",               ar: "السجل",               es: "Historial",             "pt-BR": "Histórico",         id: "Riwayat" },
  "nav.calendar":      { en: "Calendar",              ar: "التقويم",             es: "Calendario",            "pt-BR": "Calendário",        id: "Kalender" },
  "nav.todo":          { en: "To-Do",                 ar: "المهام",              es: "Tareas",                "pt-BR": "Tarefas",           id: "Tugas" },
  "nav.resources":     { en: "Help & Resources",      ar: "المساعدة والمصادر",   es: "Ayuda y recursos",      "pt-BR": "Ajuda e recursos",  id: "Bantuan & Sumber Daya" },
  "nav.settings":      { en: "Settings",              ar: "الإعدادات",           es: "Configuración",         "pt-BR": "Configurações",     id: "Pengaturan" },
  "nav.billing":       { en: "Billing",               ar: "الفوترة",             es: "Facturación",           "pt-BR": "Faturamento",       id: "Tagihan" },
  "nav.founder":       { en: "Founding Supporter",    ar: "داعم مؤسس",           es: "Miembro fundador",      "pt-BR": "Apoiador fundador", id: "Pendukung Pendiri" },
  "nav.profile":       { en: "Profile",               ar: "الملف الشخصي",        es: "Perfil",                "pt-BR": "Perfil",            id: "Profil" },
  "nav.help":          { en: "Help & Feedback",       ar: "المساعدة والمصادر",   es: "Ayuda y comentarios",   "pt-BR": "Ajuda e feedback",  id: "Bantuan & Masukan" },
  "nav.faq":           { en: "FAQ",                   ar: "الأسئلة الشائعة",     es: "Preguntas frecuentes",  "pt-BR": "Perguntas frequentes", id: "Pertanyaan Umum" },
  "nav.contact":       { en: "Contact",               ar: "اتصل بنا",            es: "Contacto",              "pt-BR": "Contato",           id: "Hubungi Kami" },
  "nav.signout":       { en: "Sign out",              ar: "تسجيل الخروج",        es: "Cerrar sesión",         "pt-BR": "Sair",              id: "Keluar" },
  "nav.upgrade":       { en: "Upgrade",               ar: "ترقية الخطة",         es: "Mejorar plan",          "pt-BR": "Fazer upgrade",     id: "Tingkatkan paket" },
  // ── Auth ──────────────────────────────────────────────────────
  "auth.login":        { en: "Log in",                ar: "تسجيل الدخول",        es: "Iniciar sesión",        "pt-BR": "Entrar",            id: "Masuk" },
  "auth.signup":       { en: "Sign up",               ar: "إنشاء حساب",          es: "Registrarse",           "pt-BR": "Criar conta",       id: "Daftar" },
  "auth.email":        { en: "Email",                 ar: "البريد الإلكتروني",   es: "Correo electrónico",    "pt-BR": "E-mail",            id: "Email" },
  "auth.password":     { en: "Password",              ar: "كلمة المرور",         es: "Contraseña",            "pt-BR": "Senha",             id: "Kata sandi" },
  "auth.password.requirement": { en: "Min 8 characters", ar: "٨ أحرف على الأقل", es: "Mín. 8 caracteres",   "pt-BR": "Mín. 8 caracteres", id: "Min. 8 karakter" },
  "auth.name":         { en: "Full name",             ar: "الاسم الكامل",        es: "Nombre completo",       "pt-BR": "Nome completo",     id: "Nama lengkap" },
  "auth.google":       { en: "Continue with Google",  ar: "المتابعة عبر Google", es: "Continuar con Google",  "pt-BR": "Continuar com Google", id: "Lanjutkan dengan Google" },
  "auth.apple":        { en: "Continue with Apple",   ar: "المتابعة عبر Apple",  es: "Continuar con Apple",   "pt-BR": "Continuar com Apple",  id: "Lanjutkan dengan Apple" },
  "auth.or":           { en: "or",                    ar: "أو",                  es: "o",                     "pt-BR": "ou",                id: "atau" },
  // ── Dashboard ─────────────────────────────────────────────────
  "dash.greeting":     { en: "Good morning",          ar: "صباح الخير",          es: "Buenos días",           "pt-BR": "Bom dia",           id: "Selamat pagi" },
  "dash.trial.days":   { en: "days left in trial",    ar: "أيام متبقية في الفترة التجريبية", es: "días restantes en el período de prueba", "pt-BR": "dias restantes no teste gratuito", id: "hari tersisa dalam uji coba" },
  "dash.trial.badge":  { en: "Free Trial",            ar: "فترة تجريبية",        es: "Prueba gratis",         "pt-BR": "Teste grátis",      id: "Uji Coba Gratis" },
  "dash.free.badge":   { en: "Free",                  ar: "مجاني",               es: "Gratis",                "pt-BR": "Grátis",            id: "Gratis" },
  "dash.paid.badge":   { en: "Pro",                   ar: "احترافي",             es: "Pro",                   "pt-BR": "Pro",               id: "Pro" },
  "dash.upgrade":      { en: "Upgrade",               ar: "ترقية الخطة",         es: "Mejorar plan",          "pt-BR": "Fazer upgrade",     id: "Tingkatkan paket" },
  "dash.summaries":    { en: "Today's Summaries",     ar: "ملخصات اليوم",        es: "Resúmenes de hoy",      "pt-BR": "Resumos de hoje",   id: "Ringkasan Hari Ini" },
  "dashboard.name.placeholder": { en: "there",        ar: "عزيزي المستخدم",      es: "aquí",                  "pt-BR": "aqui",              id: "di sini" },
  "dashboard.usage.label": { en: "Usage today",       ar: "ملخصات اليوم",        es: "Uso hoy",               "pt-BR": "Uso hoje",          id: "Penggunaan hari ini" },
  // ── TopBar ────────────────────────────────────────────────────
  "topbar.search":     { en: "Search messages, tasks, dates…", ar: "ابحث في الرسائل والمهام والتواريخ…", es: "Buscar mensajes, tareas, fechas…", "pt-BR": "Pesquisar mensagens, tarefas, datas…", id: "Cari pesan, tugas, tanggal…" },
  "topbar.notif":      { en: "Notifications",         ar: "الإشعارات",           es: "Notificaciones",        "pt-BR": "Notificações",      id: "Notifikasi" },
  // ── Actions & Greetings ──────────────────────────────────────
  "action.upgrade":    { en: "Upgrade",               ar: "ترقية الخطة",         es: "Mejorar plan",          "pt-BR": "Fazer upgrade",     id: "Tingkatkan paket" },
  "greeting.morning":  { en: "Good morning",          ar: "صباح الخير",          es: "Buenos días",           "pt-BR": "Bom dia",           id: "Selamat pagi" },
  "greeting.afternoon": { en: "Good afternoon",       ar: "نهارك سعيد",          es: "Buenas tardes",         "pt-BR": "Boa tarde",         id: "Selamat siang" },
  "greeting.evening":  { en: "Good evening",          ar: "مساء الخير",          es: "Buenas noches",         "pt-BR": "Boa noite",         id: "Selamat malam" },
  // ── Pricing ───────────────────────────────────────────────────
  "plan.founder":      { en: "Founder",               ar: "باقة المؤسسين",       es: "Fundador",              "pt-BR": "Fundador",          id: "Pendiri" },
  "plan.founder.badge": { en: "Founding Supporter",   ar: "عضو مؤسس",            es: "Miembro fundador",      "pt-BR": "Apoiador fundador", id: "Pendukung Pendiri" },
  "plan.founder.cta":  { en: "Claim founder access",  ar: "احصل على وصول المؤسس", es: "Obtener acceso de fundador", "pt-BR": "Obter acesso de fundador", id: "Dapatkan akses pendiri" },
  "plan.founder.feature.badge": { en: "Founding Supporter badge", ar: "شارة العضو المؤسس", es: "Insignia de miembro fundador", "pt-BR": "Selo de apoiador fundador", id: "Lencana Pendukung Pendiri" },
  "plan.founder.feature.community": { en: "Private WhatsApp group", ar: "مجموعة واتساب خاصة", es: "Grupo privado de WhatsApp", "pt-BR": "Grupo privado no WhatsApp", id: "Grup WhatsApp privat" },
  "pricing.billed.annually": { en: "billed annually", ar: "تُدفع سنويًا",        es: "facturado anualmente",  "pt-BR": "cobrado anualmente", id: "ditagih tahunan" },
  "pricing.refund.founder": { en: "14-day refund window on initial purchase", ar: "نافذة استرداد لمدة 14 يومًا على الشراء الأول", es: "Reembolso disponible en los primeros 14 días tras la compra inicial", "pt-BR": "Reembolso disponível em 14 dias após a compra inicial", id: "Pengembalian dana tersedia dalam 14 hari sejak pembelian pertama" },
  // ── Contact ───────────────────────────────────────────────────
  "contact.title":     { en: "Contact us",            ar: "اتصل بنا",            es: "Contáctanos",           "pt-BR": "Fale conosco",      id: "Hubungi Kami" },
  "contact.subtitle":  { en: "We're here to help",    ar: "نحن هنا للمساعدة",    es: "Estamos aquí para ayudarte", "pt-BR": "Estamos aqui para ajudar", id: "Kami siap membantu" },
  "contact.support":   { en: "Support",               ar: "الدعم الفني",         es: "Soporte",               "pt-BR": "Suporte",           id: "Dukungan" },
  "contact.name.label": { en: "Full name",            ar: "الاسم الكامل",        es: "Nombre completo",       "pt-BR": "Nome completo",     id: "Nama lengkap" },
  "contact.message.label": { en: "Message",           ar: "الرسالة",             es: "Mensaje",               "pt-BR": "Mensagem",          id: "Pesan" },
  // ── Help ──────────────────────────────────────────────────────
  "help.contact.subtitle": { en: "Still need help?",  ar: "هل لا تزال تحتاج مساعدة؟", es: "¿Aún necesitas ayuda?", "pt-BR": "Ainda precisa de ajuda?", id: "Masih butuh bantuan?" },
  "help.contact.cta":  { en: "Contact Support",       ar: "اتصل بالدعم الفني",   es: "Contactar soporte",     "pt-BR": "Falar com suporte", id: "Hubungi Dukungan" },
  // ── Sidebar ───────────────────────────────────────────────────
  "sidebar.brand.sub": { en: "School chat. Clear plan.", ar: "محادثات المدرسة، وخطة واضحة.", es: "Chats escolares. Plan claro.", "pt-BR": "Chats escolares. Plano claro.", id: "Obrolan sekolah. Rencana jelas." },
  "sidebar.nav.help":  { en: "Help & Resources",      ar: "المساعدة والمصادر",   es: "Ayuda y recursos",      "pt-BR": "Ajuda e recursos",  id: "Bantuan & Sumber Daya" },
  "sidebar.premium":   { en: "Get Premium",           ar: "احصل على العضوية المميزة", es: "Obtener Premium",    "pt-BR": "Assinar Premium",   id: "Dapatkan Premium" },
  "sidebar.priority.support": { en: "Priority support", ar: "دعم ذو أولوية",     es: "Soporte prioritario",   "pt-BR": "Suporte prioritário", id: "Dukungan prioritas" },
  // ── Settings ──────────────────────────────────────────────────
  "settings.theme":         { en: "Appearance",                        ar: "المظهر",                          es: "Apariencia",                     "pt-BR": "Aparência",               id: "Tampilan" },
  "settings.theme.desc":    { en: "Choose your preferred color scheme.", ar: "اختر نظام الألوان المفضل لديك.", es: "Elige tu esquema de colores.",    "pt-BR": "Escolha seu esquema de cores.", id: "Pilih skema warna Anda." },
  "settings.lang":          { en: "Language",                           ar: "اللغة",                           es: "Idioma",                          "pt-BR": "Idioma",                  id: "Bahasa" },
  "settings.lang.desc":     { en: "Choose your preferred language for the app.", ar: "اختر لغة التطبيق المفضلة لديك.", es: "Cambia el idioma de la aplicación.", "pt-BR": "Mude o idioma do aplicativo.", id: "Ganti bahasa aplikasi." },
  "settings.light":         { en: "Light",                              ar: "فاتح",                            es: "Claro",                           "pt-BR": "Claro",                   id: "Terang" },
  "settings.dark":          { en: "Dark",                               ar: "داكن",                            es: "Oscuro",                          "pt-BR": "Escuro",                  id: "Gelap" },
  "settings.english":       { en: "English",                            ar: "الإنجليزية",                      es: "English",                         "pt-BR": "English",                 id: "English" },
  "settings.arabic":        { en: "Arabic",                             ar: "العربية",                         es: "Árabe",                           "pt-BR": "Árabe",                   id: "Arab" },
  "settings.saved":         { en: "Saved",                              ar: "تم الحفظ",                        es: "Guardado",                        "pt-BR": "Salvo",                   id: "Tersimpan" },
  "settings.account":       { en: "Account",                            ar: "الحساب",                          es: "Cuenta",                          "pt-BR": "Conta",                   id: "Akun" },
  "settings.account.desc":  { en: "Manage your account and data.",      ar: "إدارة حسابك وبياناتك.",           es: "Administra tu cuenta y datos.",   "pt-BR": "Gerencie sua conta e dados.", id: "Kelola akun dan data Anda." },
  "settings.account.manage":{ en: "Account deletion and data export coming soon.", ar: "حذف الحساب وتصدير البيانات قريباً.", es: "Eliminación de cuenta y exportación de datos próximamente.", "pt-BR": "Exclusão de conta e exportação de dados em breve.", id: "Penghapusan akun dan ekspor data segera hadir." },
  // ── Legal ─────────────────────────────────────────────────────
  "legal.privacy":     { en: "Privacy Policy",        ar: "سياسة الخصوصية",      es: "Política de privacidad", "pt-BR": "Política de privacidade", id: "Kebijakan Privasi" },
  "legal.terms":       { en: "Terms of Service",      ar: "شروط الخدمة",         es: "Términos de servicio",  "pt-BR": "Termos de serviço",     id: "Ketentuan Layanan" },
  "legal.refunds":     { en: "Refund Policy",         ar: "سياسة الاسترداد",     es: "Política de reembolso", "pt-BR": "Política de reembolso", id: "Kebijakan Pengembalian Dana" },
};

/** Accept either the narrow dashboard Locale or the full SiteLocale. */
export function t(key: string, locale: Locale | SiteLocale = "en"): string {
  const entry = labels[key];
  if (!entry) return key;
  return (entry as Partial<Record<string, string>>)[locale] ?? entry["en"] ?? key;
}

export function pick<T>(copy: LocalizedCopy<T>, locale: SiteLocale): T {
  const val = (copy as Partial<Record<SiteLocale, T>>)[locale];
  return val !== undefined ? val : copy.en;
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
