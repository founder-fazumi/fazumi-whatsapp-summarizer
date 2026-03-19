"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CalendarDays, Captions, ClipboardPaste, Play, Sparkles, X } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: ClipboardPaste,
    step: "01",
    title: { en: "Paste your school chat", ar: "الصق محادثة المدرسة", es: "Pega tu chat del colegio", "pt-BR": "Cole seu chat da escola", id: "Tempel chat sekolah Anda" },
    imageSrc: "/brand/illustrations/paste-chat-transparent.png",
    alt: {
      en: "Parent pasting school chat into Fazumi",
      ar: "ولي أمر يلصق محادثة المدرسة في فازومي",
      es: "Padre pegando el chat del colegio en Fazumi",
      "pt-BR": "Pai colando chat da escola no Fazumi",
      id: "Orang tua menempel chat sekolah ke Fazumi",
    },
    desc: {
      en: "Copy text from WhatsApp, Telegram, or Facebook, or upload the export you already have.",
      ar: "انسخ النص من واتساب أو تيليجرام أو فيسبوك، أو ارفع ملف التصدير الذي لديك بالفعل.",
      es: "Copia el texto de WhatsApp, Telegram o Facebook, o sube el archivo de exportación que ya tienes.",
      "pt-BR": "Copie o texto do WhatsApp, Telegram ou Facebook, ou envie o arquivo de exportação que você já tem.",
      id: "Salin teks dari WhatsApp, Telegram, atau Facebook, atau unggah file ekspor yang sudah Anda miliki.",
    },
  },
  {
    icon: Sparkles,
    step: "02",
    title: { en: "Get the important points", ar: "احصل على النقاط المهمة", es: "Obtén los puntos importantes", "pt-BR": "Obtenha os pontos importantes", id: "Dapatkan poin-poin penting" },
    imageSrc: "/brand/illustrations/smart-summary-transparent.png",
    alt: {
      en: "Fazumi turning school messages into a smart summary",
      ar: "فازومي يحول رسائل المدرسة إلى ملخص ذكي",
      es: "Fazumi convirtiendo mensajes del colegio en un resumen inteligente",
      "pt-BR": "Fazumi convertendo mensagens da escola em um resumo inteligente",
      id: "Fazumi mengubah pesan sekolah menjadi ringkasan cerdas",
    },
    desc: {
      en: "Fazumi sorts the noise into due today, upcoming dates, payments/forms, supplies, questions, and urgent items.",
      ar: "يرتب Fazumi الضوضاء إلى مطلوب اليوم والمواعيد القادمة والرسوم والنماذج والمستلزمات والأسئلة والعناصر العاجلة.",
      es: "Fazumi organiza el ruido en: para hoy, fechas próximas, pagos/formularios, materiales, preguntas y elementos urgentes.",
      "pt-BR": "Fazumi organiza o ruído em: para hoje, datas próximas, pagamentos/formulários, materiais, perguntas e itens urgentes.",
      id: "Fazumi mengategorikan pesan menjadi: hari ini, tanggal mendatang, pembayaran/formulir, perlengkapan, pertanyaan, dan item mendesak.",
    },
  },
  {
    icon: CalendarDays,
    step: "03",
    title: { en: "Act with confidence", ar: "اتخذ القرار بثقة", es: "Actúa con confianza", "pt-BR": "Aja com confiança", id: "Bertindak dengan percaya diri" },
    imageSrc: "/brand/illustrations/take-action-transparent.png",
    alt: {
      en: "Parent taking action from Fazumi summary",
      ar: "ولي أمر يتخذ إجراءً بناءً على ملخص فازومي",
      es: "Padre tomando medidas a partir del resumen de Fazumi",
      "pt-BR": "Pai tomando ações a partir do resumo do Fazumi",
      id: "Orang tua mengambil tindakan dari ringkasan Fazumi",
    },
    desc: {
      en: "Export summaries as text, share with family, and keep a searchable history of every school chat you have summarized.",
      ar: "صدّر الملخصات كنص، وشاركها مع العائلة، واحتفظ بسجل قابل للبحث لكل محادثة مدرسية لخّصتها.",
      es: "Exporta los resúmenes como texto, compártelos con la familia y mantén un historial con búsqueda de todos los chats del colegio que has resumido.",
      "pt-BR": "Exporte resumos como texto, compartilhe com a família e mantenha um histórico pesquisável de todos os chats da escola que você resumiu.",
      id: "Ekspor ringkasan sebagai teks, bagikan dengan keluarga, dan simpan riwayat yang dapat dicari dari setiap chat sekolah yang pernah Anda ringkas.",
    },
  },
] as const;

const COPY = {
  eyebrow: { en: "How it works", ar: "كيف يعمل", es: "Cómo funciona", "pt-BR": "Como funciona", id: "Cara kerja" },
  title: { en: "From noisy chats to clear next steps", ar: "من ضوضاء المجموعات إلى خطوات واضحة", es: "De chats ruidosos a pasos claros", "pt-BR": "De chats barulhentos a próximas etapas claras", id: "Dari obrolan bising ke langkah berikutnya yang jelas" },
  subtitle: {
    en: "See deadlines, fees, forms, supplies, and urgent follow-up without reading every message.",
    ar: "شاهد المواعيد والرسوم والنماذج والمستلزمات والمتابعة العاجلة من دون قراءة كل رسالة.",
    es: "Ve fechas límite, honorarios, formularios, materiales y seguimiento urgente sin leer cada mensaje.",
    "pt-BR": "Veja prazos, taxas, formulários, materiais e acompanhamento urgente sem ler cada mensagem.",
    id: "Lihat tenggat waktu, biaya, formulir, perlengkapan, dan tindak lanjut mendesak tanpa membaca setiap pesan.",
  },
  videoBadge: { en: "90-second demo", ar: "عرض خلال 90 ثانية", es: "Demo de 90 segundos", "pt-BR": "Demo de 90 segundos", id: "Demo 90 detik" },
  videoTitle: { en: "See a real school chat turn into clarity", ar: "شاهد محادثة مدرسية تتحول إلى وضوح", es: "Ve un chat escolar real convertirse en claridad", "pt-BR": "Veja um chat escolar real se transformar em clareza", id: "Lihat chat sekolah nyata berubah menjadi kejelasan" },
  videoBody: {
    en: "A fast problem-solution walkthrough: crowded WhatsApp chat in, one calm family-ready summary out.",
    ar: "عرض سريع للمشكلة والحل: محادثة واتساب مزدحمة تدخل، وملخص هادئ جاهز للعائلة يخرج.",
    es: "Una guía rápida del problema-solución: chat de WhatsApp abarrotado entra, un resumen familiar tranquilo y listo sale.",
    "pt-BR": "Um guia rápido problema-solução: chat do WhatsApp lotado entra, um resumo familiar tranquilo e pronto sai.",
    id: "Panduan cepat masalah-solusi: chat WhatsApp yang penuh masuk, satu ringkasan keluarga yang tenang dan siap keluar.",
  },
  videoCta: { en: "Watch the 90-second demo", ar: "شاهد العرض خلال 90 ثانية", es: "Ver el demo de 90 segundos", "pt-BR": "Assistir ao demo de 90 segundos", id: "Tonton demo 90 detik" },
  modalTitle: { en: "Fazumi product demo", ar: "عرض فازومي التوضيحي", es: "Demo del producto Fazumi", "pt-BR": "Demo do produto Fazumi", id: "Demo produk Fazumi" },
  modalHint: {
    en: "Replace the placeholder YouTube ID with the final Fazumi video when recording is ready.",
    ar: "استبدل معرّف يوتيوب المؤقت بفيديو فازومي النهائي عند جاهزية التسجيل.",
    es: "Reemplaza el ID de YouTube con el video final de Fazumi cuando esté listo.",
    "pt-BR": "Substitua o ID do YouTube pelo vídeo final do Fazumi quando estiver pronto.",
    id: "Ganti ID YouTube placeholder dengan video Fazumi final saat rekaman siap.",
  },
} as const;

const VIDEO_TRACKS = {
  en: ["English captions", "Arabic subtitles"],
  ar: ["ترجمة إنجليزية", "ترجمة عربية"],
  es: ["Subtítulos en inglés", "Subtítulos en árabe"],
  "pt-BR": ["Legendas em inglês", "Legendas em árabe"],
  id: ["Teks bahasa Inggris", "Teks bahasa Arab"],
} satisfies LocalizedCopy<readonly string[]>;

export function HowItWorks() {
  const { locale, siteLocale } = useLang();
  const [videoOpen, setVideoOpen] = useState(false);
  const subtitleTracks = pick(VIDEO_TRACKS, siteLocale);
  const videoId = process.env.NEXT_PUBLIC_FAZUMI_DEMO_VIDEO_ID ?? "dQw4w9WgXcQ";
  // Keep the demo UI in code and only show it once the final recording is ready.
  const demoEnabled = process.env.NEXT_PUBLIC_FAZUMI_DEMO_READY === "true";

  useEffect(() => {
    if (!videoOpen) return;

    const previousOverflow = document.body.style.overflow;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setVideoOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [videoOpen]);

  return (
    <>
      <section
        dir={locale === "ar" ? "rtl" : "ltr"}
        lang={siteLocale}
        className={cn("page-section bg-[var(--page-layer)]", locale === "ar" && "font-arabic")}
      >
        <div className="page-shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
              {pick(COPY.eyebrow, siteLocale)}
            </p>
            <h2 className="mt-3 text-[var(--text-2xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-3xl)]">
              {pick(COPY.title, siteLocale)}
            </h2>
            <p className="mt-3 text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
              {pick(COPY.subtitle, siteLocale)}
            </p>
          </div>

          {demoEnabled ? (
            <div className="mx-auto mt-12 max-w-5xl">
              <div className="surface-panel-elevated overflow-hidden">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                  <button
                    type="button"
                    onClick={() => setVideoOpen(true)}
                    className="group relative overflow-hidden bg-[var(--surface-muted)] text-left"
                    aria-label={pick(COPY.videoCta, siteLocale)}
                  >
                    <div
                      className="aspect-video h-full w-full p-4 sm:p-6"
                      style={{
                        background:
                          "linear-gradient(140deg, rgba(36, 112, 82, 0.14), rgba(255, 255, 255, 0.88), rgba(229, 161, 92, 0.18))",
                      }}
                    >
                      <div className="grid h-full gap-4 md:grid-cols-[0.9fr_1.1fr]">
                        <div className="rounded-[var(--radius-lg)] border border-white/60 bg-white/88 p-3 shadow-[var(--shadow-sm)]">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                            <span className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                              WhatsApp chat
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-[#dcf8c6] px-3 py-2 text-[13px] text-[#1e2b1f] shadow-[var(--shadow-xs)]">
                              Reminder: math test Monday and field-trip form due Wednesday.
                            </div>
                            <div className="max-w-[86%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[13px] text-[#38443d] shadow-[var(--shadow-xs)]">
                              Science presentations begin Friday. Please share slides tonight.
                            </div>
                            <div className="ml-auto max-w-[76%] rounded-2xl rounded-br-md bg-[#dcf8c6] px-3 py-2 text-[13px] text-[#1e2b1f] shadow-[var(--shadow-xs)]">
                              Can both parents receive the summary?
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]/95 p-3 shadow-[var(--shadow-sm)]">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                              Fazumi summary
                            </span>
                            <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[var(--text-xs)] font-bold text-[var(--primary)]">
                              6 sections
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-3">
                              <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                TL;DR
                              </p>
                              <p className="mt-2 text-[13px] leading-relaxed text-[var(--foreground)]">
                                Math test Monday. Form deadline Wednesday. Science presentations Friday.
                              </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-3">
                                <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                  Dates
                                </p>
                                <div className="mt-2 h-12 rounded-[var(--radius-sm)] bg-white/70" />
                              </div>
                              <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-3">
                                <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                  Tasks
                                </p>
                                <div className="mt-2 h-12 rounded-[var(--radius-sm)] bg-white/70" />
                              </div>
                            </div>
                            <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-3">
                              <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                Family share
                              </p>
                              <div className="mt-2 flex gap-2">
                                <div className="h-7 flex-1 rounded-full bg-white/70" />
                                <div className="h-7 flex-1 rounded-full bg-white/70" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[var(--shadow-lg)] transition-transform duration-200 group-hover:scale-105 sm:h-20 sm:w-20">
                          <Play className="ml-1 h-8 w-8 fill-current sm:h-9 sm:w-9" />
                        </div>
                      </div>

                      <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/88 px-3 py-1 text-[var(--text-xs)] font-bold uppercase tracking-[0.16em] text-[var(--accent-fox-deep)] shadow-[var(--shadow-xs)]">
                        {pick(COPY.videoBadge, siteLocale)}
                      </div>

                      <div className="absolute bottom-4 left-4 right-4 rounded-[var(--radius-lg)] border border-white/60 bg-white/88 p-3 shadow-[var(--shadow-sm)] backdrop-blur">
                        <p className="text-[var(--text-base)] font-semibold text-[var(--foreground)]">
                          {pick(COPY.videoCta, siteLocale)}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {subtitleTracks.map((track) => (
                            <span
                              key={track}
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[var(--text-xs)] font-semibold text-[var(--foreground)]"
                            >
                              <Captions className="h-3 w-3" />
                              {track}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-col justify-center gap-4 border-t border-[var(--border)] bg-[var(--surface-elevated)] px-6 py-6 lg:border-l lg:border-t-0 lg:px-8">
                    <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                      {pick(COPY.videoBadge, siteLocale)}
                    </p>
                    <h3 className="text-[var(--text-2xl)] font-bold text-[var(--foreground)]">
                      {pick(COPY.videoTitle, siteLocale)}
                    </h3>
                    <p className="text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                      {pick(COPY.videoBody, siteLocale)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setVideoOpen(true)}
                      className="inline-flex h-12 w-fit items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--primary)] px-5 text-[var(--text-sm)] font-semibold text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--primary-hover)]"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      {pick(COPY.videoCta, siteLocale)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ step, title, desc, imageSrc, alt }) => (
              <div
                key={step}
                className="surface-panel bg-[var(--surface-elevated)] px-5 py-5 sm:px-6 sm:py-6"
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)]">
                  <div className="relative h-full w-full p-4 sm:p-5">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_58%)]" />
                    <Image
                      src={imageSrc}
                      alt={pick(alt, siteLocale)}
                      fill
                      sizes="(min-width: 768px) 30vw, 100vw"
                      className="z-10 object-contain"
                      priority={step === "01"}
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[var(--text-xs)] font-semibold text-[var(--muted-foreground)]">
                    {step}
                  </p>
                  <h3 className="mt-2 text-[var(--text-xl)] font-semibold leading-tight text-[var(--foreground)] sm:text-[var(--text-2xl)]">
                    {pick(title, siteLocale)}
                  </h3>
                  <p className="mt-3 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                    {pick(desc, siteLocale)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {demoEnabled && videoOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-[var(--surface-elevated)] shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={pick(COPY.modalTitle, siteLocale)}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[var(--text-base)] font-semibold text-[var(--foreground)]">
                  {pick(COPY.modalTitle, siteLocale)}
                </p>
                <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                  {pick(COPY.modalHint, siteLocale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVideoOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                aria-label="Close video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="aspect-video bg-black">
              <iframe
                title={pick(COPY.modalTitle, siteLocale)}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&cc_load_policy=1&cc_lang_pref=${locale === "ar" ? "ar" : "en"}&hl=${locale}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-5 py-4 sm:px-6">
              {subtitleTracks.map((track) => (
                <span
                  key={track}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[var(--text-xs)] font-semibold text-[var(--foreground)]"
                >
                  <Captions className="h-3 w-3" />
                  {track}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
