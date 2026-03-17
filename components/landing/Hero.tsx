"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SampleSummary = {
  tldr: string;
  actionItems: readonly string[];
  importantDates: readonly string[];
  followUpQuestions: readonly string[];
  helpfulLinks: readonly string[];
};

type DemoState = "idle" | "typing" | "loading" | "preview" | "error";

const HEADLINE_INTERVAL_MS = 3_000;
const HEADLINE_SWAP_DELAY_MS = 200;
const DEMO_MAX_CHARS = 2500;

const HEADLINES = [
  {
    en: "Stop reading 300 messages to find one deadline. Your school group, summarised in seconds.",
    ar: "توقف عن قراءة 300 رسالة للعثور على موعد واحد. مجموعتك المدرسية، ملخّصة في ثوانٍ.",
    es: "Deja de leer 300 mensajes para encontrar una fecha límite. Tu grupo escolar, resumido en segundos.",
    "pt-BR": "Pare de ler 300 mensagens para encontrar um prazo. Seu grupo escolar, resumido em segundos.",
    id: "Berhenti membaca 300 pesan hanya untuk mencari satu tenggat waktu. Grup sekolah Anda, dirangkum dalam hitungan detik.",
  },
  {
    en: "Every fee, form, date, and supply list. Pulled from your school WhatsApp group — automatically.",
    ar: "كل رسوم ونموذج وموعد وقائمة مستلزمات. مستخرجة من مجموعة واتساب مدرستك — تلقائيًا.",
    es: "Cada cuota, formulario, fecha y lista de materiales. Extraídos de tu grupo escolar de WhatsApp — automáticamente.",
    "pt-BR": "Cada taxa, formulário, data e lista de materiais. Extraídos do seu grupo escolar do WhatsApp — automaticamente.",
    id: "Setiap biaya, formulir, tanggal, dan daftar perlengkapan. Diambil dari grup WhatsApp sekolah Anda — secara otomatis.",
  },
  {
    en: "Turn WhatsApp, Telegram, and Facebook school chats into one action-ready family dashboard.",
    ar: "حوّل محادثات المدرسة من واتساب وتيليجرام وفيسبوك إلى لوحة عائلية واحدة جاهزة للتنفيذ.",
    es: "Convierte los chats escolares de WhatsApp, Telegram y Facebook en un panel familiar listo para actuar.",
    "pt-BR": "Transforme os chats escolares do WhatsApp, Telegram e Facebook em um painel familiar pronto para a ação.",
    id: "Ubah obrolan sekolah di WhatsApp, Telegram, dan Facebook menjadi satu dasbor keluarga yang siap ditindaklanjuti.",
  },
] as const satisfies readonly LocalizedCopy<string>[];

const SUBTITLES = [
  {
    en: "Paste your school group chat and get urgent actions, upcoming dates, fees, forms, and supplies separated and sorted — not buried in 300 messages.",
    ar: "الصق محادثة مجموعتك المدرسية واحصل على الإجراءات العاجلة والمواعيد والرسوم والنماذج والمستلزمات مفصولة ومرتبة — لا مدفونة في 300 رسالة.",
    es: "Pega tu chat del grupo escolar y obtén acciones urgentes, fechas próximas, cuotas, formularios y materiales separados y ordenados — no enterrados en 300 mensajes.",
    "pt-BR": "Cole o chat do seu grupo escolar e obtenha ações urgentes, datas próximas, taxas, formulários e materiais separados e organizados — não enterrados em 300 mensagens.",
    id: "Tempel obrolan grup sekolah Anda dan dapatkan tindakan mendesak, tanggal mendatang, biaya, formulir, dan perlengkapan yang terpisah dan tersortir — bukan terkubur dalam 300 pesan.",
  },
  {
    en: "Bilingual by default. Arabic-first output, real school fee wording, and one-click calendar or to-do for every extracted date.",
    ar: "ثنائي اللغة افتراضيًا. إخراج عربي أولًا، رسوم مدرسية واضحة، وإضافة بنقرة للتقويم أو المهام لكل موعد مستخرج.",
    es: "Multilingüe por defecto. Texto real de cuotas escolares y un clic al calendario o tareas para cada fecha extraída.",
    "pt-BR": "Multilíngue por padrão. Texto real de taxas escolares e um clique para adicionar ao calendário ou lista de tarefas cada data extraída.",
    id: "Multibahasa secara bawaan. Teks biaya sekolah yang nyata dan satu klik ke kalender atau daftar tugas untuk setiap tanggal yang diekstrak.",
  },
  {
    en: "Manual import first. Autopilot-lite second: morning digest, urgent alerts, reminders, and one-click calendar or to-do actions.",
    ar: "الاستيراد اليدوي أولًا. ثم الطيار الآلي الخفيف: ملخص صباحي وتنبيهات عاجلة وتذكيرات وإجراءات بنقرة واحدة للتقويم أو قائمة المهام.",
    es: "Importación manual primero. Piloto automático ligero después: resumen matutino, alertas urgentes, recordatorios y acciones de un clic para el calendario o lista de tareas.",
    "pt-BR": "Importação manual primeiro. Piloto automático leve depois: resumo matinal, alertas urgentes, lembretes e ações de um clique para o calendário ou lista de tarefas.",
    id: "Impor manual terlebih dahulu. Autopilot ringan berikutnya: ringkasan pagi, peringatan mendesak, pengingat, dan tindakan satu klik ke kalender atau daftar tugas.",
  },
] as const satisfies readonly LocalizedCopy<string>[];

const SAMPLE_CHAT = `[15/02/2025, 09:23] Ms. Sarah - Math Teacher: Good morning parents! Reminder: math test on Monday covering chapters 4-6. Please review practice problems.
[15/02/2025, 09:25] Parent Committee: Field trip forms due Wednesday! $15 payment required. Send with child.
[15/02/2025, 09:27] Science Dept: Science fair projects due Friday. Presentation slides must be uploaded by Thursday 8pm.
[15/02/2025, 09:30] Admin: Sports practice Thursday 3pm. Send sports kit and water bottle.`;

const COPY = {
  badge: {
    en: "AI-powered school chat summarizer",
    ar: "ملخّص محادثات مدرسية بالذكاء الاصطناعي",
    es: "Resumidor de chats escolares con IA",
    "pt-BR": "Resumidor de chats escolares com IA",
    id: "Perangkum obrolan sekolah berbasis AI",
  },
  cta: {
    en: "Try it free — no card needed",
    ar: "جرّبه مجانًا — بدون بطاقة",
    es: "Pruébalo gratis — sin tarjeta",
    "pt-BR": "Experimente grátis — sem cartão",
    id: "Coba gratis — tanpa kartu",
  },
  founderSupportCta: {
    en: "Founding supporter plan",
    ar: "خطة الداعم المؤسس",
    es: "Plan de apoyo fundador",
    "pt-BR": "Plano de apoiador fundador",
    id: "Paket pendukung pendiri",
  },
  trustLine: {
    en: "Raw chats never stored · Arabic & English output · Works with WhatsApp, Telegram & Facebook",
    ar: "المحادثات لا تُحفظ أبدًا · إخراج عربي وإنجليزي · يعمل مع واتساب وتيليجرام وفيسبوك",
    es: "Los chats nunca se almacenan · Salida multilingüe · Funciona con WhatsApp, Telegram y Facebook",
    "pt-BR": "Chats nunca armazenados · Saída multilíngue · Funciona com WhatsApp, Telegram e Facebook",
    id: "Obrolan tidak pernah disimpan · Output multibahasa · Berfungsi dengan WhatsApp, Telegram & Facebook",
  },
  demoEyebrow: {
    en: "Live demo — paste your own chat",
    ar: "تجربة مباشرة — الصق محادثتك",
    es: "Demo en vivo — pega tu propio chat",
    "pt-BR": "Demo ao vivo — cole seu próprio chat",
    id: "Demo langsung — tempel obrolan Anda sendiri",
  },
  demoBody: {
    en: "Paste any school WhatsApp, Telegram, or Facebook group chat and see what Fazumi extracts in seconds.",
    ar: "الصق أي محادثة من مجموعة واتساب أو تيليجرام أو فيسبوك المدرسية واكتشف ما يستخرجه Fazumi في ثوانٍ.",
    es: "Pega cualquier chat de grupo escolar de WhatsApp, Telegram o Facebook y mira lo que Fazumi extrae en segundos.",
    "pt-BR": "Cole qualquer chat de grupo escolar do WhatsApp, Telegram ou Facebook e veja o que o Fazumi extrai em segundos.",
    id: "Tempel obrolan grup sekolah apa pun dari WhatsApp, Telegram, atau Facebook dan lihat apa yang diekstrak Fazumi dalam hitungan detik.",
  },
  demoPlaceholder: {
    en: "Paste your school group chat here — WhatsApp, Telegram, or Facebook…",
    ar: "الصق محادثة مجموعتك المدرسية هنا — واتساب أو تيليجرام أو فيسبوك…",
    es: "Pega aquí el chat de tu grupo escolar — WhatsApp, Telegram o Facebook…",
    "pt-BR": "Cole aqui o chat do seu grupo escolar — WhatsApp, Telegram ou Facebook…",
    id: "Tempel obrolan grup sekolah Anda di sini — WhatsApp, Telegram, atau Facebook…",
  },
  demoHint: {
    en: "Demo limit: 2,500 characters",
    ar: "حد التجربة: 2500 حرف",
    es: "Límite de demo: 2.500 caracteres",
    "pt-BR": "Limite do demo: 2.500 caracteres",
    id: "Batas demo: 2.500 karakter",
  },
  demoUseSample: {
    en: "Use sample chat",
    ar: "استخدم محادثة نموذجية",
    es: "Usar chat de ejemplo",
    "pt-BR": "Usar chat de exemplo",
    id: "Gunakan obrolan contoh",
  },
  demoGenerate: {
    en: "Create sample summary",
    ar: "أنشئ ملخصًا تجريبيًا",
    es: "Crear resumen de ejemplo",
    "pt-BR": "Criar resumo de exemplo",
    id: "Buat ringkasan contoh",
  },
  demoGenerating: {
    en: "Creating your summary...",
    ar: "جارٍ إنشاء ملخّصك...",
    es: "Creando tu resumen...",
    "pt-BR": "Criando seu resumo...",
    id: "Membuat ringkasan Anda...",
  },
  previewEyebrow: {
    en: "Family dashboard preview",
    ar: "معاينة اللوحة العائلية",
    es: "Vista previa del panel familiar",
    "pt-BR": "Prévia do painel familiar",
    id: "Pratinjau dasbor keluarga",
  },
  previewBadge: {
    en: "Action Center first",
    ar: "لوحة الإجراءات أولًا",
    es: "Centro de acción primero",
    "pt-BR": "Centro de ação primeiro",
    id: "Pusat tindakan terlebih dahulu",
  },
  tldr: {
    en: "TL;DR",
    ar: "الخلاصة السريعة",
    es: "Resumen",
    "pt-BR": "Resumo",
    id: "Ringkasan",
  },
  actionItems: {
    en: "Action items",
    ar: "المهام المطلوبة",
    es: "Tareas",
    "pt-BR": "Tarefas",
    id: "Tugas",
  },
  importantDates: {
    en: "Important dates",
    ar: "المواعيد المهمة",
    es: "Fechas importantes",
    "pt-BR": "Datas importantes",
    id: "Tanggal penting",
  },
  questions: {
    en: "Questions to follow up",
    ar: "أسئلة للمتابعة",
    es: "Preguntas de seguimiento",
    "pt-BR": "Perguntas de acompanhamento",
    id: "Pertanyaan tindak lanjut",
  },
  helpfulLinks: {
    en: "Helpful links",
    ar: "روابط مفيدة",
    es: "Recursos útiles",
    "pt-BR": "Links úteis",
    id: "Tautan berguna",
  },
  overlayTitle: {
    en: "Sign up free to see the full summary — dates, fees, forms, and supplies included",
    ar: "سجّل مجانًا لرؤية الملخص كاملًا — المواعيد والرسوم والنماذج والمستلزمات مشمولة",
    es: "Regístrate gratis para ver el resumen completo — fechas, cuotas, formularios y materiales incluidos",
    "pt-BR": "Cadastre-se grátis para ver o resumo completo — datas, taxas, formulários e materiais incluídos",
    id: "Daftar gratis untuk melihat ringkasan lengkap — tanggal, biaya, formulir, dan perlengkapan sudah termasuk",
  },
  overlayBody: {
    en: "Save to history, add dates to your calendar, share with your spouse, and never miss a school deadline again.",
    ar: "احفظ في السجل، أضف المواعيد لتقويمك، شارك مع شريكك، ولا تفوّت موعدًا مدرسيًا بعد الآن.",
    es: "Guarda en el historial, añade fechas al calendario, comparte con tu pareja y nunca pierdas una fecha escolar.",
    "pt-BR": "Salve no histórico, adicione datas ao calendário, compartilhe com seu cônjuge e nunca perca um prazo escolar.",
    id: "Simpan ke riwayat, tambahkan tanggal ke kalender, bagikan dengan pasangan, dan jangan pernah melewatkan tenggat waktu sekolah.",
  },
  startTrial: {
    en: "Start free — takes 30 seconds",
    ar: "ابدأ مجانًا — 30 ثانية فقط",
    es: "Empieza gratis — solo 30 segundos",
    "pt-BR": "Comece grátis — leva 30 segundos",
    id: "Mulai gratis — hanya 30 detik",
  },
} as const;

const OVERLAY_FEATURES: LocalizedCopy<readonly string[]> = {
  en: ["Fees & forms extracted", "Dates → calendar in one click", "Share with co-parent"],
  ar: ["استخراج الرسوم والنماذج", "المواعيد → التقويم بنقرة", "شارك مع الشريك"],
  es: ["Cuotas y formularios extraídos", "Fechas → calendario en un clic", "Compartir con el otro progenitor"],
  "pt-BR": ["Taxas e formulários extraídos", "Datas → calendário em um clique", "Compartilhar com o cônjuge"],
  id: ["Biaya & formulir diekstrak", "Tanggal → kalender dalam satu klik", "Bagikan ke orang tua lainnya"],
};

const SAMPLE_SUMMARY = {
  en: {
    tldr: "Math test Monday, field trip forms due Wednesday, science fair Friday.",
    actionItems: [
      "Review math chapters 4 to 6 for Monday's test.",
      "Sign and return the field-trip form with the $15 payment by Wednesday.",
      "Upload science presentation slides by Thursday at 8pm.",
    ],
    importantDates: [
      "Monday: Math test on chapters 4 to 6.",
      "Wednesday: Field-trip form and $15 payment due.",
      "Friday: Science fair projects due.",
    ],
    followUpQuestions: [
      "Should parents send extra materials for the science fair?",
      "Will sports practice finish at the usual pickup time on Thursday?",
    ],
    helpfulLinks: [
      "Field-trip form and payment reminder",
      "Science presentation upload instructions",
    ],
  },
  ar: {
    tldr: "اختبار الرياضيات يوم الإثنين، ونموذج الرحلة المدرسية مطلوب يوم الأربعاء، ومشروع العلوم يوم الجمعة.",
    actionItems: [
      "راجع فصول الرياضيات من 4 إلى 6 لاختبار يوم الإثنين.",
      "وقّع نموذج الرحلة المدرسية وأعده مع مبلغ 15 دولارًا قبل يوم الأربعاء.",
      "ارفع شرائح عرض مشروع العلوم قبل الخميس الساعة 8 مساءً.",
    ],
    importantDates: [
      "الإثنين: اختبار رياضيات في الفصول 4 إلى 6.",
      "الأربعاء: آخر موعد لنموذج الرحلة المدرسية مع الرسوم.",
      "الجمعة: آخر موعد لمشاريع معرض العلوم.",
    ],
    followUpQuestions: [
      "هل يحتاج الطلاب إلى مواد إضافية لمعرض العلوم؟",
      "هل ينتهي تدريب الرياضة يوم الخميس في وقت الاستلام المعتاد؟",
    ],
    helpfulLinks: [
      "تذكير نموذج الرحلة المدرسية والدفع",
      "تعليمات رفع شرائح عرض العلوم",
    ],
  },
} satisfies LocalizedCopy<SampleSummary>;

export function Hero() {
  const { siteLocale } = useLang();
  const isRtl = siteLocale === "ar";
  const overlayFeatures = pick(OVERLAY_FEATURES, siteLocale);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [headlineVisible, setHeadlineVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [demoState, setDemoState] = useState<DemoState>("idle");
  const [demoText, setDemoText] = useState("");
  const [apiSummary, setApiSummary] = useState<SampleSummary | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const swapTimeoutRef = useRef<number | null>(null);

  const displayedHeadlineIndex = prefersReducedMotion ? 0 : headlineIndex;
  const activeHeadline = pick(HEADLINES[displayedHeadlineIndex], siteLocale);
  const activeSubtitle = pick(SUBTITLES[displayedHeadlineIndex], siteLocale);
  const isHeadlineVisible = prefersReducedMotion ? true : headlineVisible;
  const isLoadingDemo = demoState === "loading";
  const isPreviewVisible = demoState === "preview";
  const isErrorState = demoState === "error";
  const displayedSummary = apiSummary ?? pick(SAMPLE_SUMMARY, siteLocale);
  const demoCharsRemaining = DEMO_MAX_CHARS - demoText.length;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMotionPreference);
      return () => mediaQuery.removeEventListener("change", updateMotionPreference);
    }

    mediaQuery.addListener(updateMotionPreference);
    return () => mediaQuery.removeListener(updateMotionPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setHeadlineVisible(false);
      swapTimeoutRef.current = window.setTimeout(() => {
        setHeadlineIndex((current) => (current + 1) % HEADLINES.length);
        setHeadlineVisible(true);
      }, HEADLINE_SWAP_DELAY_MS);
    }, HEADLINE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      if (swapTimeoutRef.current !== null) {
        window.clearTimeout(swapTimeoutRef.current);
      }
    };
  }, [prefersReducedMotion]);

  function handleDemoTextChange(value: string) {
    const nextValue = value.slice(0, DEMO_MAX_CHARS);
    setDemoText(nextValue);
    if (nextValue.trim().length > 0) {
      setDemoState("typing");
    } else {
      setDemoState("idle");
      setApiSummary(null);
      setDemoError(null);
    }
  }

  function handleUseSample() {
    setDemoText(SAMPLE_CHAT);
    setDemoState("typing");
    setApiSummary(null);
    setDemoError(null);
  }

  async function handleDemoPreview() {
    if (!demoText.trim() || isLoadingDemo) return;

    setDemoState("loading");
    setDemoError(null);

    try {
      const res = await fetch("/api/demo/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: demoText, lang_pref: siteLocale }),
      });
      const data = (await res.json()) as SampleSummary & { error?: string };
      if (!res.ok) {
        setDemoError(data.error ?? "Could not generate summary.");
        setDemoState("error");
        return;
      }
      setApiSummary(data);
      setDemoState("preview");
    } catch {
      setDemoError("Network error. Please try again.");
      setDemoState("error");
    }
  }

  return (
    <section
      dir={isRtl ? "rtl" : "ltr"}
      lang={siteLocale}
      className={cn("page-section pt-20 md:pt-32", isRtl && "font-arabic")}
    >
      <div className="page-shell">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text-xs)] font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)]", isRtl && "flex-row-reverse")}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
              {pick(COPY.badge, siteLocale)}
            </div>

            <div aria-live="polite">
              <h1
                className={cn(
                  "mt-6 min-h-[7.5rem] font-bold leading-tight tracking-tight text-[var(--foreground)] transition-opacity duration-300 sm:min-h-[8.5rem] md:min-h-[9rem]",
                  "text-[var(--text-3xl)] sm:text-[var(--text-5xl)] md:text-[var(--text-6xl)]",
                  isHeadlineVisible ? "opacity-100" : "opacity-0"
                )}
              >
                {activeHeadline}
              </h1>

              <p
                className={cn(
                  "mx-auto mt-4 min-h-[5.75rem] max-w-2xl text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)] transition-opacity duration-300 md:min-h-[6.25rem] md:text-[var(--text-lg)]",
                  isHeadlineVisible ? "opacity-100" : "opacity-0"
                )}
              >
                {activeSubtitle}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login?tab=signup"
                className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--primary)] px-8 text-[var(--text-sm)] font-semibold text-white shadow-[var(--shadow-md)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                {pick(COPY.cta, siteLocale)}
                <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
              </Link>
              <Link
                href="/founder-support"
                className="inline-flex h-12 items-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-6 text-[var(--text-sm)] font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                {pick(COPY.founderSupportCta, siteLocale)}
              </Link>
            </div>

            <p className="mt-4 text-[var(--text-sm)] text-[var(--muted-foreground)]">
              {pick(COPY.trustLine, siteLocale)}
            </p>
          </div>

          <div className="mx-auto w-full max-w-3xl">
            <div className="shine-wrap">
              <div className="shine-inner hero-backdrop overflow-hidden rounded-[calc(var(--radius-xl)-1px)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                      {pick(COPY.demoEyebrow, siteLocale)}
                    </p>
                    <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                      {pick(COPY.demoBody, siteLocale)}
                    </p>
                  </div>
                  <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[var(--text-xs)] font-bold uppercase tracking-[0.14em] text-[var(--accent-fox-deep)] shadow-[var(--shadow-xs)]">
                    {pick(COPY.demoHint, siteLocale)}
                  </span>
                </div>

                <div className="space-y-6 bg-[var(--surface-elevated)] px-5 py-5 sm:px-6 sm:py-6">
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
                    <Textarea
                      aria-label={pick(COPY.demoPlaceholder, siteLocale)}
                      value={demoText}
                      onChange={(event) => handleDemoTextChange(event.target.value)}
                      placeholder={pick(COPY.demoPlaceholder, siteLocale)}
                      rows={7}
                      maxLength={DEMO_MAX_CHARS}
                      disabled={isLoadingDemo}
                      className="min-h-[11rem] resize-none border-0 bg-transparent px-0 py-0 text-[var(--text-base)] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <div className={cn("mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between", isRtl && "sm:flex-row-reverse")}>
                      <div className={cn("flex flex-wrap items-center gap-3", isRtl && "sm:flex-row-reverse")}>
                        <button
                          type="button"
                          onClick={handleUseSample}
                          disabled={isLoadingDemo}
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-[var(--text-sm)] font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pick(COPY.demoUseSample, siteLocale)}
                        </button>
                        <span className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                          {demoCharsRemaining} / {DEMO_MAX_CHARS}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => { void handleDemoPreview(); }}
                        disabled={!demoText.trim() || isLoadingDemo}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--primary)] px-5 text-[var(--text-sm)] font-semibold text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isLoadingDemo ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            {pick(COPY.demoGenerating, siteLocale)}
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            {pick(COPY.demoGenerate, siteLocale)}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {isLoadingDemo ? (
                    <div className="flex min-h-[19rem] flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-xs)]">
                      <LoaderCircle className="h-7 w-7 animate-spin text-[var(--primary)]" />
                      <div>
                        <p className="text-[var(--text-lg)] font-semibold text-[var(--foreground)]">
                          {pick(COPY.demoGenerating, siteLocale)}
                        </p>
                        <p className="mt-2 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                          {pick(SUBTITLES[1], siteLocale)}
                        </p>
                      </div>
                    </div>
                  ) : isPreviewVisible ? (
                    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                        <div>
                          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                            {pick(COPY.previewEyebrow, siteLocale)}
                          </p>
                          <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                            {pick(SUBTITLES[1], siteLocale)}
                          </p>
                        </div>
                        <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1 text-[var(--text-xs)] font-bold uppercase tracking-[0.14em] text-[var(--accent-fox-deep)] shadow-[var(--shadow-xs)]">
                          {pick(COPY.previewBadge, siteLocale)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                            {pick(COPY.tldr, siteLocale)}
                          </p>
                          <p className="mt-3 text-[var(--text-base)] leading-relaxed text-[var(--foreground)]">
                            {displayedSummary.tldr}
                          </p>
                        </div>

                        <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                            {pick(COPY.actionItems, siteLocale)}
                          </p>
                          <ul className="mt-3 space-y-3">
                            {displayedSummary.actionItems.map((item) => (
                              <li key={item} className="flex items-start gap-3">
                                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--primary)]" />
                                <span className="text-[var(--text-base)] leading-relaxed text-[var(--foreground)]">
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="relative overflow-hidden rounded-[var(--radius)]">
                          <div className="pointer-events-none select-none space-y-4 blur-[4px]">
                            <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                              <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                {pick(COPY.importantDates, siteLocale)}
                              </p>
                              <ul className="mt-3 space-y-2 text-[var(--text-base)] leading-relaxed text-[var(--foreground)]">
                                {displayedSummary.importantDates.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                                <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                  {pick(COPY.questions, siteLocale)}
                                </p>
                                <ul className="mt-3 space-y-2 text-[var(--text-sm)] leading-relaxed text-[var(--foreground)]">
                                  {displayedSummary.followUpQuestions.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                                <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                  {pick(COPY.helpfulLinks, siteLocale)}
                                </p>
                                <ul className="mt-3 space-y-2 text-[var(--text-sm)] leading-relaxed text-[var(--foreground)]">
                                  {displayedSummary.helpfulLinks.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-[var(--background)]/78 to-[var(--background)] px-6 text-center">
                            <p className="max-w-sm text-[var(--text-xl)] font-semibold text-[var(--foreground)]">
                              {pick(COPY.overlayTitle, siteLocale)}
                            </p>
                            <p className="mt-3 max-w-md text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                              {pick(COPY.overlayBody, siteLocale)}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                              {overlayFeatures.map((feature) => (
                                <span
                                  key={feature}
                                  className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-sm)] font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                            <Link
                              href="/login?tab=signup"
                              className="mt-5 inline-flex h-12 items-center rounded-[var(--radius-lg)] bg-[var(--primary)] px-8 text-[var(--text-sm)] font-semibold text-white shadow-[var(--shadow-md)] transition-colors hover:bg-[var(--primary-hover)]"
                            >
                              {pick(COPY.startTrial, siteLocale)}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isErrorState ? (
                    <div className="flex min-h-[8rem] flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-5 py-6 text-center shadow-[var(--shadow-xs)]">
                      <p className="text-[var(--text-base)] font-semibold text-[var(--destructive)]">
                        {demoError ?? (siteLocale === "ar" ? "حدث خطأ. حاول مجددًا." : "Something went wrong. Please try again.")}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-6 text-center shadow-[var(--shadow-xs)]">
                      <p className="text-[var(--text-lg)] font-semibold text-[var(--foreground)]">
                        {pick(HEADLINES[0], siteLocale)}
                      </p>
                      <p className="mt-2 text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                        {pick(COPY.demoBody, siteLocale)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
