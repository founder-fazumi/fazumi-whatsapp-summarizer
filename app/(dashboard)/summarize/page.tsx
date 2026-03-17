"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowUpCircle, Check, Sparkles, Upload } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import type { ImportSourcePlatform } from "@/lib/chat-import/source-detect";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { FounderWelcomeModal } from "@/components/founder/FounderWelcomeModal";
import { PmfSurveyModal } from "@/components/pmf/PmfSurveyModal";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { FollowUpPanel } from "@/components/summary/FollowUpPanel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { inferGroupLabelFromFilename, type SummarizeZipRange } from "@/lib/chat-import/whatsapp";
import { useLang } from "@/lib/context/LangContext";
import { getClientHealthSnapshot, getTodoStorageMode } from "@/lib/feature-health";
import { detectImportSource } from "@/lib/chat-import/source-detect";
import {
  familyContextHasSignal,
  normalizeFamilyContext,
  normalizeSummaryRetentionDays,
  type FamilyContext,
} from "@/lib/family-context";
import { createClient } from "@/lib/supabase/client";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";
import { getDailyLimit, resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import { haptic } from "@/lib/haptics";
import { emitDashboardInsightsRefresh } from "@/lib/hooks/useDashboardInsights";
import { getSampleChat } from "@/lib/sampleChats";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { paymentsComingSoon, withPaymentComingSoonLabel } from "@/lib/payments-ui";
import { mergeLocalTodoLabels } from "@/lib/todos/local";
import { cn } from "@/lib/utils";

const MAX_CHARS = 30_000;
const SOFT_COUNT_THRESHOLD = 25_000;
const SOURCE_OPTIONS: Array<{
  value: ImportSourcePlatform;
  label: LocalizedCopy<string>;
}> = [
  {
    value: "whatsapp",
    label: { en: "WhatsApp", ar: "واتساب", es: "WhatsApp", "pt-BR": "WhatsApp", id: "WhatsApp" },
  },
  {
    value: "telegram",
    label: { en: "Telegram", ar: "تيليجرام", es: "Telegram", "pt-BR": "Telegram", id: "Telegram" },
  },
  {
    value: "facebook",
    label: { en: "Facebook", ar: "فيسبوك", es: "Facebook", "pt-BR": "Facebook", id: "Facebook" },
  },
];
const OUTPUT_LANGUAGE_OPTIONS = [
  { value: "auto", label: { en: "Auto", ar: "تلقائي", es: "Auto", "pt-BR": "Auto", id: "Otomatis" } },
  { value: "en", label: { en: "English", ar: "الإنجليزية", es: "Inglés", "pt-BR": "Inglês", id: "Inggris" } },
  { value: "ar", label: { en: "العربية", ar: "العربية", es: "Árabe", "pt-BR": "Árabe", id: "Arab" } },
  { value: "es", label: { en: "Spanish", ar: "الإسبانية", es: "Español", "pt-BR": "Espanhol", id: "Spanyol" } },
  { value: "pt-BR", label: { en: "Portuguese", ar: "البرتغالية", es: "Portugués", "pt-BR": "Português", id: "Portugis" } },
  { value: "id", label: { en: "Indonesian", ar: "الإندونيسية", es: "Indonesio", "pt-BR": "Indonésio", id: "Indonesia" } },
  { value: "hi", label: { en: "Hindi", ar: "الهندية", es: "Hindi", "pt-BR": "Hindi", id: "Hindi" } },
  { value: "ur", label: { en: "Urdu", ar: "الأردية", es: "Urdu", "pt-BR": "Urdu", id: "Urdu" } },
] as const;
const ZIP_RANGE_OPTIONS: Array<{
  value: SummarizeZipRange;
  label: LocalizedCopy<string>;
}> = [
  {
    value: "24h",
    label: {
      en: "Last 24 hours",
      ar: "آخر 24 ساعة",
      es: "Últimas 24 horas",
      "pt-BR": "Últimas 24 horas",
      id: "24 jam terakhir",
    },
  },
  {
    value: "7d",
    label: {
      en: "Last 7 days",
      ar: "آخر 7 أيام",
      es: "Últimos 7 días",
      "pt-BR": "Últimos 7 dias",
      id: "7 hari terakhir",
    },
  },
];
const MILESTONE_THRESHOLDS = [1, 5, 10, 25, 50] as const;
const SUMMARY_MILESTONE_STORAGE_PREFIX = "fazumi_milestone_seen";
const SUMMARY_DISCOVERY_STORAGE_KEY = "fazumi_discovery_seen";

type OutputLang = (typeof OUTPUT_LANGUAGE_OPTIONS)[number]["value"];
type SubmissionSource = "text" | "zip";
type MilestoneThreshold = (typeof MILESTONE_THRESHOLDS)[number];
type SummaryNoticeId = `milestone-${MilestoneThreshold}` | "discovery-5";
type SavedGroupOption = {
  id: string;
  title: string;
};
type ZipApiResponse =
  | {
    status: "ok";
    summary: SummaryResult;
    savedId?: string | null;
    range: SummarizeZipRange;
    newMessagesProcessed: number;
    group?: {
      title?: string | null;
    };
  }
  | {
    status: "no_new_messages";
    range: SummarizeZipRange;
    newMessagesProcessed: 0;
    group?: {
      title?: string | null;
    };
  }
  | {
    status: "error";
    error?: string;
    code?: string;
  };

const COPY = {
  title: {
    en: "Turn school chats into one action-ready family dashboard",
    ar: "حوّل محادثات المدرسة إلى لوحة عائلية جاهزة للتنفيذ",
    es: "Convierte chats escolares en un panel familiar listo para actuar",
    "pt-BR": "Transforme chats escolares em um painel familiar pronto para ação",
    id: "Ubah chat sekolah menjadi dasbor keluarga yang siap ditindaklanjuti",
  },
  subtitle: {
    en: "Paste or upload school chats from WhatsApp, Telegram, or Facebook and get one calm dashboard for dates, tasks, fees, forms, and urgent follow-up.",
    ar: "الصق أو ارفع محادثات المدرسة من واتساب أو تيليجرام أو فيسبوك واحصل على لوحة هادئة واحدة للتواريخ والمهام والرسوم والنماذج والمتابعة العاجلة.",
    es: "Pega o sube chats del colegio de WhatsApp, Telegram o Facebook y obtén un panel tranquilo con fechas, tareas, honorarios, formularios y seguimiento urgente.",
    "pt-BR": "Cole ou envie chats escolares do WhatsApp, Telegram ou Facebook e obtenha um painel tranquilo com datas, tarefas, taxas, formulários e acompanhamento urgente.",
    id: "Tempel atau unggah chat sekolah dari WhatsApp, Telegram, atau Facebook dan dapatkan satu dasbor tenang untuk tanggal, tugas, biaya, formulir, dan tindak lanjut mendesak.",
  },
  placeholder: {
    en: "Paste the school chat here...",
    ar: "الصق محادثة المدرسة هنا...",
    es: "Pega el chat del colegio aquí...",
    "pt-BR": "Cole o chat da escola aqui...",
    id: "Tempel chat sekolah di sini...",
  },
  uploadText: {
    en: "Import .txt",
    ar: "استيراد .txt",
    es: "Importar .txt",
    "pt-BR": "Importar .txt",
    id: "Impor .txt",
  },
  uploadZip: {
    en: "Choose ZIP",
    ar: "اختر ZIP",
    es: "Elegir ZIP",
    "pt-BR": "Escolher ZIP",
    id: "Pilih ZIP",
  },
  useSample: {
    en: "Use sample",
    ar: "استخدم نموذجًا",
    es: "Usar ejemplo",
    "pt-BR": "Usar exemplo",
    id: "Gunakan contoh",
  },
  summarize: {
    en: "Summarize",
    ar: "لخّص",
    es: "Resumir",
    "pt-BR": "Resumir",
    id: "Ringkas",
  },
  summarizing: {
    en: "Reading your chat…",
    ar: "جاري قراءة محادثتك…",
    es: "Leyendo tu chat…",
    "pt-BR": "Lendo seu chat…",
    id: "Membaca chat Anda…",
  },
  privacy: {
    en: "Only the saved summary is kept. Raw chat text is not stored.",
    ar: "يتم حفظ الملخص فقط. لا يتم تخزين نص المحادثة الخام.",
    es: "Solo se guarda el resumen. El texto del chat no se almacena.",
    "pt-BR": "Apenas o resumo salvo é mantido. O texto do chat não é armazenado.",
    id: "Hanya ringkasan yang tersimpan. Teks chat mentah tidak disimpan.",
  },
  sourceTitle: {
    en: "Chat source",
    ar: "مصدر المحادثة",
    es: "Fuente del chat",
    "pt-BR": "Fonte do chat",
    id: "Sumber chat",
  },
  sourceHint: {
    en: "Pick the app you copied from. Fazumi also auto-detects pasted formats when it can.",
    ar: "اختر التطبيق الذي نسخت منه. يحاول Fazumi أيضًا اكتشاف التنسيق الملصق تلقائيًا عندما يستطيع.",
    es: "Elige la app de la que copiaste. Fazumi también detecta automáticamente los formatos pegados cuando puede.",
    "pt-BR": "Escolha o aplicativo do qual você copiou. O Fazumi também detecta formatos colados automaticamente quando possível.",
    id: "Pilih aplikasi tempat Anda menyalin. Fazumi juga mendeteksi format yang ditempel secara otomatis bila memungkinkan.",
  },
  sourceAutoDetected: {
    en: "Auto-detected from your pasted chat",
    ar: "تم اكتشافه تلقائيًا من المحادثة الملصقة",
    es: "Detectado automáticamente de tu chat pegado",
    "pt-BR": "Detectado automaticamente do seu chat colado",
    id: "Terdeteksi otomatis dari chat yang Anda tempel",
  },
  groupName: {
    en: "Saved group name",
    ar: "اسم المجموعة المحفوظ",
    es: "Nombre de grupo guardado",
    "pt-BR": "Nome do grupo salvo",
    id: "Nama grup tersimpan",
  },
  groupNamePlaceholder: {
    en: "Example: Grade 4 Parents",
    ar: "مثال: أولياء أمور الصف الرابع",
    es: "Ejemplo: Padres del Grado 4",
    "pt-BR": "Exemplo: Pais do 4º Ano",
    id: "Contoh: Wali Kelas 4",
  },
  groupHint: {
    en: "Use the same name next time so repeat imports and history stay organized.",
    ar: "استخدم الاسم نفسه لاحقًا حتى تبقى الاستيرادات المتكررة والسجل منظمين.",
    es: "Usa el mismo nombre la próxima vez para que las importaciones repetidas y el historial queden organizados.",
    "pt-BR": "Use o mesmo nome da próxima vez para que as importações repetidas e o histórico fiquem organizados.",
    id: "Gunakan nama yang sama di lain waktu agar impor berulang dan riwayat tetap teratur.",
  },
  savedGroups: {
    en: "Recent groups",
    ar: "المجموعات الأخيرة",
    es: "Grupos recientes",
    "pt-BR": "Grupos recentes",
    id: "Grup terbaru",
  },
  savedGroupsHint: {
    en: "Tap a saved group to speed up repeat imports.",
    ar: "اضغط على مجموعة محفوظة لتسريع الاستيرادات المتكررة.",
    es: "Toca un grupo guardado para agilizar las importaciones repetidas.",
    "pt-BR": "Toque em um grupo salvo para agilizar as importações repetidas.",
    id: "Ketuk grup tersimpan untuk mempercepat impor berulang.",
  },
  importFit: {
    en: "Paste text for WhatsApp, Telegram, or Facebook. ZIP uploads remain best for WhatsApp exports only.",
    ar: "الصق النص لواتساب أو تيليجرام أو فيسبوك. يظل رفع ZIP الأفضل لتصديرات واتساب فقط.",
    es: "Pega texto para WhatsApp, Telegram o Facebook. Las subidas ZIP son las mejores para exportaciones de WhatsApp únicamente.",
    "pt-BR": "Cole texto para WhatsApp, Telegram ou Facebook. Os uploads ZIP continuam sendo os melhores apenas para exportações do WhatsApp.",
    id: "Tempel teks untuk WhatsApp, Telegram, atau Facebook. Unggahan ZIP tetap terbaik khusus untuk ekspor WhatsApp.",
  },
  memoryTitle: {
    en: "Saved family context",
    ar: "سياق العائلة المحفوظ",
    es: "Contexto familiar guardado",
    "pt-BR": "Contexto familiar salvo",
    id: "Konteks keluarga tersimpan",
  },
  memoryBody: {
    en: "Help Fazumi remember your school, child, class, teachers, and recurring links so the second summary is smarter than the first.",
    ar: "ساعد Fazumi على تذكّر المدرسة والطفل والصف والمعلمين والروابط المتكررة حتى يصبح الملخص الثاني أذكى من الأول.",
    es: "Ayuda a Fazumi a recordar tu colegio, hijo, clase, profesores y enlaces recurrentes para que el segundo resumen sea más inteligente que el primero.",
    "pt-BR": "Ajude o Fazumi a se lembrar da sua escola, filho, turma, professores e links recorrentes para que o segundo resumo seja mais inteligente que o primeiro.",
    id: "Bantu Fazumi mengingat sekolah, anak, kelas, guru, dan tautan berulang Anda agar ringkasan kedua lebih cerdas dari yang pertama.",
  },
  memoryEmpty: {
    en: "No family context saved yet. Add it in Settings for better fee, form, and class-aware summaries.",
    ar: "لا يوجد سياق عائلي محفوظ بعد. أضِفه من الإعدادات للحصول على ملخصات أفضل للرسوم والنماذج والصف.",
    es: "Aún no hay contexto familiar guardado. Agrégalo en Configuración para obtener mejores resúmenes de honorarios, formularios y clase.",
    "pt-BR": "Nenhum contexto familiar salvo ainda. Adicione nas Configurações para obter melhores resumos de taxas, formulários e turma.",
    id: "Belum ada konteks keluarga yang tersimpan. Tambahkan di Pengaturan untuk ringkasan biaya, formulir, dan kelas yang lebih baik.",
  },
  memoryEdit: {
    en: "Edit memory",
    ar: "عدّل الذاكرة",
    es: "Editar memoria",
    "pt-BR": "Editar memória",
    id: "Edit memori",
  },
  retention: {
    en: "Summary retention",
    ar: "مدة الاحتفاظ بالملخصات",
    es: "Retención de resúmenes",
    "pt-BR": "Retenção de resumos",
    id: "Retensi ringkasan",
  },
  retentionKeep: {
    en: "Keep until I delete",
    ar: "الاحتفاظ حتى أحذفها",
    es: "Conservar hasta que los elimine",
    "pt-BR": "Manter até que eu exclua",
    id: "Simpan sampai saya hapus",
  },
  retentionDays: {
    en: "days",
    ar: "يومًا",
    es: "días",
    "pt-BR": "dias",
    id: "hari",
  },
  autopilotTitle: {
    en: "Autopilot-lite is already live",
    ar: "وضع الطيار الآلي الخفيف متاح الآن",
    es: "Piloto automático ligero ya está disponible",
    "pt-BR": "Piloto automático leve já está ativo",
    id: "Autopilot-lite sudah aktif",
  },
  autopilotBody: {
    en: "Morning digest, urgent alerts, calendar export, to-do seeding, and family sharing are all built around the same summary.",
    ar: "الملخص الصباحي والتنبيهات العاجلة وتصدير التقويم وإنشاء المهام ومشاركة العائلة كلها مبنية حول الملخص نفسه.",
    es: "El resumen matutino, las alertas urgentes, la exportación del calendario, la creación de tareas y el uso compartido familiar están todos basados en el mismo resumen.",
    "pt-BR": "Resumo matinal, alertas urgentes, exportação de calendário, criação de tarefas e compartilhamento familiar são todos construídos em torno do mesmo resumo.",
    id: "Ringkasan pagi, peringatan mendesak, ekspor kalender, pembuatan tugas, dan berbagi keluarga semuanya dibangun di sekitar ringkasan yang sama.",
  },
  pasteSection: {
    en: "Paste or import chat text",
    ar: "الصق نص المحادثة أو استورد ملفًا نصيًا",
    es: "Pegar o importar texto del chat",
    "pt-BR": "Colar ou importar texto do chat",
    id: "Tempel atau impor teks chat",
  },
  pasteSectionHint: {
    en: "Manual import is the main launch flow. Paste directly or use a plain .txt export.",
    ar: "الاستيراد اليدوي هو مسار الإطلاق الأساسي. الصق مباشرة أو استخدم ملف .txt عادي.",
    es: "La importación manual es el flujo de lanzamiento principal. Pega directamente o usa una exportación .txt normal.",
    "pt-BR": "A importação manual é o fluxo de lançamento principal. Cole diretamente ou use uma exportação .txt simples.",
    id: "Impor manual adalah alur peluncuran utama. Tempel langsung atau gunakan ekspor .txt biasa.",
  },
  zipSection: {
    en: "Incremental ZIP upload",
    ar: "رفع ZIP التدريجي",
    es: "Subida ZIP incremental",
    "pt-BR": "Upload ZIP incremental",
    id: "Unggah ZIP bertahap",
  },
  zipSectionHint: {
    en: "Upload a ZIP with text exports only. Fazumi summarizes only new messages in the selected range and skips already-processed ones for the same group.",
    ar: "ارفع ملف ZIP يحتوي على تصديرات نصية فقط. يقوم Fazumi بتلخيص الرسائل الجديدة فقط ضمن المدة المحددة ويتجاوز ما تمّت معالجته سابقًا للمجموعة نفسها.",
    es: "Sube un ZIP con exportaciones de texto únicamente. Fazumi resume solo los mensajes nuevos en el rango seleccionado y omite los ya procesados para el mismo grupo.",
    "pt-BR": "Envie um ZIP apenas com exportações de texto. O Fazumi resume apenas as novas mensagens no intervalo selecionado e ignora as já processadas para o mesmo grupo.",
    id: "Unggah ZIP hanya dengan ekspor teks. Fazumi meringkas hanya pesan baru dalam rentang yang dipilih dan melewati yang sudah diproses untuk grup yang sama.",
  },
  zipPrivacy: {
    en: "Only summary metadata and message fingerprints are stored for incremental matching. Raw chat text is still not saved.",
    ar: "يتم حفظ بيانات وصفية للملخص وبصمات الرسائل فقط للمطابقة التدريجية. لا يتم حفظ نص المحادثة الخام.",
    es: "Solo se almacenan metadatos del resumen y huellas de mensajes para la coincidencia incremental. El texto del chat en bruto aún no se guarda.",
    "pt-BR": "Apenas metadados de resumo e impressões digitais de mensagens são armazenados para correspondência incremental. O texto bruto do chat ainda não é salvo.",
    id: "Hanya metadata ringkasan dan sidik jari pesan yang disimpan untuk pencocokan bertahap. Teks chat mentah tetap tidak disimpan.",
  },
  zipSelectedFile: {
    en: "Selected ZIP",
    ar: "ملف ZIP المحدد",
    es: "ZIP seleccionado",
    "pt-BR": "ZIP selecionado",
    id: "ZIP yang dipilih",
  },
  zipNoFile: {
    en: "No ZIP selected yet.",
    ar: "لم يتم اختيار ملف ZIP بعد.",
    es: "Aún no se ha seleccionado ningún ZIP.",
    "pt-BR": "Nenhum ZIP selecionado ainda.",
    id: "Belum ada ZIP yang dipilih.",
  },
  zipGroupName: {
    en: "Group name",
    ar: "اسم المجموعة",
    es: "Nombre del grupo",
    "pt-BR": "Nome do grupo",
    id: "Nama grup",
  },
  zipGroupHint: {
    en: "Use the same group name on later uploads so Fazumi can match fingerprints correctly.",
    ar: "استخدم اسم المجموعة نفسه في الرفعات اللاحقة حتى يطابق Fazumi البصمات بشكل صحيح.",
    es: "Usa el mismo nombre de grupo en subidas posteriores para que Fazumi pueda hacer coincidir las huellas correctamente.",
    "pt-BR": "Use o mesmo nome de grupo em uploads posteriores para que o Fazumi possa corresponder as impressões digitais corretamente.",
    id: "Gunakan nama grup yang sama pada unggahan berikutnya agar Fazumi dapat mencocokkan sidik jari dengan benar.",
  },
  zipRange: {
    en: "Summarize window",
    ar: "نافذة التلخيص",
    es: "Ventana de resumen",
    "pt-BR": "Janela de resumo",
    id: "Jendela ringkasan",
  },
  zipSubmit: {
    en: "Summarize ZIP",
    ar: "لخّص ملف ZIP",
    es: "Resumir ZIP",
    "pt-BR": "Resumir ZIP",
    id: "Ringkas ZIP",
  },
  zipSubmitting: {
    en: "Processing ZIP...",
    ar: "جارٍ معالجة ZIP...",
    es: "Procesando ZIP...",
    "pt-BR": "Processando ZIP...",
    id: "Memproses ZIP...",
  },
  zipSelectFirst: {
    en: "Choose a ZIP export first.",
    ar: "اختر تصدير ZIP أولًا.",
    es: "Primero elige una exportación ZIP.",
    "pt-BR": "Escolha primeiro uma exportação ZIP.",
    id: "Pilih ekspor ZIP terlebih dahulu.",
  },
  zipProcessed: {
    en: "New messages processed",
    ar: "الرسائل الجديدة التي تمت معالجتها",
    es: "Mensajes nuevos procesados",
    "pt-BR": "Novas mensagens processadas",
    id: "Pesan baru yang diproses",
  },
  zipNoNewMessages: {
    en: "No new messages in this range since the last upload.",
    ar: "لا توجد رسائل جديدة ضمن هذه المدة منذ آخر رفع.",
    es: "No hay mensajes nuevos en este rango desde la última subida.",
    "pt-BR": "Nenhuma mensagem nova neste intervalo desde o último upload.",
    id: "Tidak ada pesan baru dalam rentang ini sejak unggahan terakhir.",
  },
  zipNoNewMessagesHint: {
    en: "Try a wider range or upload a newer export from the same group.",
    ar: "جرّب مدة أوسع أو ارفع تصديرًا أحدث من المجموعة نفسها.",
    es: "Prueba un rango más amplio o sube una exportación más reciente del mismo grupo.",
    "pt-BR": "Tente um intervalo mais amplo ou envie uma exportação mais recente do mesmo grupo.",
    id: "Coba rentang yang lebih luas atau unggah ekspor terbaru dari grup yang sama.",
  },
  zipParseError: {
    en: "We could not detect WhatsApp-style messages in that export.",
    ar: "تعذر اكتشاف رسائل واتساب في هذا التصدير.",
    es: "No se pudieron detectar mensajes estilo WhatsApp en esa exportación.",
    "pt-BR": "Não foi possível detectar mensagens no estilo WhatsApp nessa exportação.",
    id: "Kami tidak dapat mendeteksi pesan gaya WhatsApp di ekspor tersebut.",
  },
  textTooLong: {
    en: "This chat is over the 30,000 character limit. Shorten it, then try again.",
    ar: "هذه المحادثة تتجاوز حد 30,000 حرف. اختصرها ثم حاول مرة أخرى.",
    es: "Este chat supera el límite de 30.000 caracteres. Acórtalo e inténtalo de nuevo.",
    "pt-BR": "Este chat ultrapassa o limite de 30.000 caracteres. Encurte-o e tente novamente.",
    id: "Chat ini melebihi batas 30.000 karakter. Persingkat dan coba lagi.",
  },
  charCount: {
    en: "characters used",
    ar: "حرف مستخدم",
    es: "caracteres usados",
    "pt-BR": "caracteres usados",
    id: "karakter digunakan",
  },
  networkError: {
    en: "We could not reach Fazumi right now. Check your connection and try again.",
    ar: "تعذر الوصول إلى Fazumi الآن. تحقّق من الاتصال ثم حاول مرة أخرى.",
    es: "No pudimos conectar con Fazumi ahora mismo. Comprueba tu conexión e inténtalo de nuevo.",
    "pt-BR": "Não foi possível acessar o Fazumi agora. Verifique sua conexão e tente novamente.",
    id: "Kami tidak dapat menjangkau Fazumi sekarang. Periksa koneksi Anda dan coba lagi.",
  },
  unknownError: {
    en: "Something went wrong. Please try again.",
    ar: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    es: "Algo salió mal. Por favor, inténtalo de nuevo.",
    "pt-BR": "Algo deu errado. Por favor, tente novamente.",
    id: "Ada yang salah. Silakan coba lagi.",
  },
  fileTooLarge: {
    en: "That file is over 10 MB. Upload a smaller export.",
    ar: "هذا الملف أكبر من 10 ميغابايت. ارفع تصديرًا أصغر.",
    es: "Ese archivo supera los 10 MB. Sube una exportación más pequeña.",
    "pt-BR": "Esse arquivo tem mais de 10 MB. Envie uma exportação menor.",
    id: "File tersebut melebihi 10 MB. Unggah ekspor yang lebih kecil.",
  },
  ignoredMedia: {
    en: "Media files were skipped. Text was imported.",
    ar: "تم تجاهل ملفات الوسائط وتم استيراد النص.",
    es: "Los archivos multimedia se omitieron. Se importó el texto.",
    "pt-BR": "Arquivos de mídia foram ignorados. O texto foi importado.",
    id: "File media dilewati. Teks berhasil diimpor.",
  },
  noTextFiles: {
    en: "No text files were found in that zip archive.",
    ar: "لم يتم العثور على ملفات نصية داخل هذا الملف المضغوط.",
    es: "No se encontraron archivos de texto en ese archivo comprimido.",
    "pt-BR": "Nenhum arquivo de texto foi encontrado nesse arquivo compactado.",
    id: "Tidak ada file teks yang ditemukan dalam arsip zip tersebut.",
  },
  unsupportedFile: {
    en: "Use a .txt or .zip export from the chat.",
    ar: "استخدم ملف .txt أو .zip من تصدير المحادثة.",
    es: "Usa una exportación .txt o .zip del chat.",
    "pt-BR": "Use uma exportação .txt ou .zip do chat.",
    id: "Gunakan ekspor .txt atau .zip dari chat.",
  },
  fileReadError: {
    en: "We could not read that file. Try exporting the chat again.",
    ar: "تعذر قراءة هذا الملف. حاول تصدير المحادثة مرة أخرى.",
    es: "No pudimos leer ese archivo. Intenta exportar el chat de nuevo.",
    "pt-BR": "Não foi possível ler esse arquivo. Tente exportar o chat novamente.",
    id: "Kami tidak dapat membaca file tersebut. Coba ekspor chat lagi.",
  },
  limitBodyDailyFree: {
    en: "You've reached today's limit. Your history is still available.",
    ar: "لقد وصلت إلى حد اليوم. يبقى سجلك متاحًا.",
    es: "Has alcanzado el límite de hoy. Tu historial sigue disponible.",
    "pt-BR": "Você atingiu o limite de hoje. Seu histórico ainda está disponível.",
    id: "Anda telah mencapai batas hari ini. Riwayat Anda masih tersedia.",
  },
  limitBodyDailyPaid: {
    en: "You've reached today's plan limit. Your history, calendar export, and family sharing are still available. You can summarize again tomorrow.",
    ar: "لقد وصلت إلى حد خطتك لليوم. يبقى السجل وتصدير التقويم والمشاركة العائلية متاحة. يمكنك التلخيص مرة أخرى غدًا.",
    es: "Has alcanzado el límite de tu plan de hoy. El historial, la exportación del calendario y el uso compartido familiar siguen disponibles. Puedes volver a resumir mañana.",
    "pt-BR": "Você atingiu o limite do seu plano hoje. O histórico, exportação de calendário e compartilhamento familiar ainda estão disponíveis. Você pode resumir novamente amanhã.",
    id: "Anda telah mencapai batas paket hari ini. Riwayat, ekspor kalender, dan berbagi keluarga masih tersedia. Anda dapat meringkas lagi besok.",
  },
  limitBodyLifetime: {
    en: "You've used the free summaries included with your account. Your history is still available.",
    ar: "لقد استخدمت الملخصات المجانية المضمنة في حسابك. يبقى سجلك متاحًا.",
    es: "Has utilizado los resúmenes gratuitos incluidos en tu cuenta. Tu historial sigue disponible.",
    "pt-BR": "Você utilizou os resumos gratuitos incluídos na sua conta. Seu histórico ainda está disponível.",
    id: "Anda telah menggunakan ringkasan gratis yang disertakan dalam akun Anda. Riwayat Anda masih tersedia.",
  },
  limitBenefitDailyFree: {
    en: "With Fazumi Pro: 50 summaries per day - enough for every school group, every day of the school term.",
    ar: "مع Fazumi Pro: 50 ملخصاً يومياً - يكفي لكل مجموعة مدرسية، كل يوم خلال الفصل الدراسي.",
    es: "Con Fazumi Pro: 50 resúmenes al día, suficientes para cada grupo escolar, cada día del trimestre.",
    "pt-BR": "Com o Fazumi Pro: 50 resumos por dia, suficientes para cada grupo escolar, todos os dias do período letivo.",
    id: "Dengan Fazumi Pro: 50 ringkasan per hari — cukup untuk setiap grup sekolah, setiap hari selama semester.",
  },
  limitBenefitLifetime: {
    en: "Fazumi Pro keeps your school history growing all year - summaries, dates, action items, always within reach.",
    ar: "Fazumi Pro يبقي تاريخك المدرسي ينمو طوال العام - ملخصات، مواعيد، بنود إجراءات، دائماً في متناول يدك.",
    es: "Fazumi Pro mantiene tu historial escolar creciendo todo el año: resúmenes, fechas, acciones, siempre al alcance.",
    "pt-BR": "O Fazumi Pro mantém seu histórico escolar crescendo o ano todo: resumos, datas, itens de ação, sempre ao alcance.",
    id: "Fazumi Pro membuat riwayat sekolah Anda terus berkembang sepanjang tahun — ringkasan, tanggal, item tindakan, selalu mudah dijangkau.",
  },
  limitTitleDailyFree: {
    en: "Today's free summaries are used",
    ar: "تم استخدام ملخصاتك المجانية لليوم",
    es: "Los resúmenes gratuitos de hoy están agotados",
    "pt-BR": "Os resumos gratuitos de hoje foram usados",
    id: "Ringkasan gratis hari ini telah habis",
  },
  limitTitleDailyPaid: {
    en: "Today's summaries are complete",
    ar: "اكتملت ملخصات اليوم",
    es: "Los resúmenes de hoy están completos",
    "pt-BR": "Os resumos de hoje estão completos",
    id: "Ringkasan hari ini sudah selesai",
  },
  limitTitleLifetime: {
    en: "Your included free summaries are used",
    ar: "تم استخدام الملخصات المجانية المتاحة لك",
    es: "Tus resúmenes gratuitos incluidos están agotados",
    "pt-BR": "Seus resumos gratuitos incluídos foram usados",
    id: "Ringkasan gratis yang disertakan telah habis",
  },
  limitBenefitVolume: {
    en: "50 summaries a day",
    ar: "50 ملخصًا يوميًا",
    es: "50 resúmenes al día",
    "pt-BR": "50 resumos por dia",
    id: "50 ringkasan per hari",
  },
  limitBenefitCalendar: {
    en: "Calendar export",
    ar: "تصدير التقويم",
    es: "Exportar al calendario",
    "pt-BR": "Exportar para o calendário",
    id: "Ekspor kalender",
  },
  limitBenefitSharing: {
    en: "Family sharing",
    ar: "المشاركة العائلية",
    es: "Compartir con la familia",
    "pt-BR": "Compartilhamento familiar",
    id: "Berbagi keluarga",
  },
  limitBenefitActions: {
    en: "Synced action lists",
    ar: "مزامنة قوائم الإجراءات",
    es: "Listas de acciones sincronizadas",
    "pt-BR": "Listas de ações sincronizadas",
    id: "Daftar tindakan yang disinkronkan",
  },
  limitBenefitHistory: {
    en: "History stays available",
    ar: "يبقى السجل متاحًا",
    es: "Historial siempre disponible",
    "pt-BR": "Histórico sempre disponível",
    id: "Riwayat tetap tersedia",
  },
  limitBenefitTomorrow: {
    en: "Summaries reset tomorrow",
    ar: "يتجدد التلخيص غدًا",
    es: "Los resúmenes se renuevan mañana",
    "pt-BR": "Os resumos são redefinidos amanhã",
    id: "Ringkasan diperbarui besok",
  },
  nearLimitOne: {
    en: "1 summary remaining today",
    ar: "ملخص واحد متبقٍ اليوم",
    es: "1 resumen restante hoy",
    "pt-BR": "1 resumo restante hoje",
    id: "1 ringkasan tersisa hari ini",
  },
  nearLimitZero: {
    en: "0 summaries remaining today - resets at midnight",
    ar: "لا ملخصات متبقية اليوم - تُجدَّد عند منتصف الليل",
    es: "0 resúmenes restantes hoy - se renueva a medianoche",
    "pt-BR": "0 resumos restantes hoje — redefine à meia-noite",
    id: "0 ringkasan tersisa hari ini — diperbarui tengah malam",
  },
  viewHistory: {
    en: "View history",
    ar: "عرض السجل",
    es: "Ver historial",
    "pt-BR": "Ver histórico",
    id: "Lihat riwayat",
  },
  saved: {
    en: "Saved to history",
    ar: "تم الحفظ في السجل",
    es: "Guardado en el historial",
    "pt-BR": "Salvo no histórico",
    id: "Disimpan ke riwayat",
  },
  view: {
    en: "View",
    ar: "عرض",
    es: "Ver",
    "pt-BR": "Ver",
    id: "Lihat",
  },
  outputLanguage: {
    en: "Summary language",
    ar: "لغة الملخص",
    es: "Idioma del resumen",
    "pt-BR": "Idioma do resumo",
    id: "Bahasa ringkasan",
  },
  outputLanguageHint: {
    en: "Choose a fixed output language or let Fazumi detect it from the chat.",
    ar: "اختر لغة إخراج ثابتة أو دع Fazumi يكتشفها من المحادثة.",
    es: "Elige un idioma de salida fijo o deja que Fazumi lo detecte del chat.",
    "pt-BR": "Escolha um idioma de saída fixo ou deixe o Fazumi detectá-lo pelo chat.",
    id: "Pilih bahasa output tetap atau biarkan Fazumi mendeteksinya dari chat.",
  },
  quickOptionsTitle: {
    en: "Quick options",
    ar: "خيارات سريعة",
    es: "Opciones rápidas",
    "pt-BR": "Opções rápidas",
    id: "Opsi cepat",
  },
  quickOptionsHint: {
    en: "Set the summary language and chat source here without leaving the paste box.",
    ar: "حدّد لغة الملخص ومصدر المحادثة هنا من دون مغادرة مربع اللصق.",
    es: "Configura el idioma del resumen y la fuente del chat aquí sin salir del cuadro de pegado.",
    "pt-BR": "Defina o idioma do resumo e a fonte do chat aqui sem sair da caixa de colagem.",
    id: "Atur bahasa ringkasan dan sumber chat di sini tanpa meninggalkan kotak tempel.",
  },
  detectedLanguage: {
    en: "Detected input language",
    ar: "لغة الإدخال المكتشفة",
    es: "Idioma de entrada detectado",
    "pt-BR": "Idioma de entrada detectado",
    id: "Bahasa input terdeteksi",
  },
  detectedArabic: {
    en: "Arabic",
    ar: "العربية",
    es: "Árabe",
    "pt-BR": "Árabe",
    id: "Arab",
  },
  detectedEnglish: {
    en: "English",
    ar: "الإنجليزية",
    es: "Inglés",
    "pt-BR": "Inglês",
    id: "Inggris",
  },
  setupTitle: {
    en: "Manual import setup",
    ar: "إعداد الاستيراد اليدوي",
    es: "Configuración de importación manual",
    "pt-BR": "Configuração de importação manual",
    id: "Pengaturan impor manual",
  },
  setupHint: {
    en: "Keep school groups organised and reuse recent groups so repeat imports stay fast.",
    ar: "حافظ على تنظيم مجموعات المدرسة وأعد استخدام المجموعات الأخيرة حتى تبقى الاستيرادات المتكررة سريعة.",
    es: "Mantén los grupos del colegio organizados y reutiliza los grupos recientes para que las importaciones repetidas sean rápidas.",
    "pt-BR": "Mantenha os grupos da escola organizados e reutilize grupos recentes para que as importações repetidas sejam rápidas.",
    id: "Jaga grup sekolah tetap terorganisir dan gunakan kembali grup terbaru agar impor berulang tetap cepat.",
  },
  noSavedGroups: {
    en: "No saved groups yet. Your recent school groups will appear here after the first saved summary.",
    ar: "لا توجد مجموعات محفوظة بعد. ستظهر مجموعات المدرسة الأخيرة هنا بعد أول ملخص محفوظ.",
    es: "Aún no hay grupos guardados. Tus grupos escolares recientes aparecerán aquí después del primer resumen guardado.",
    "pt-BR": "Nenhum grupo salvo ainda. Seus grupos escolares recentes aparecerão aqui após o primeiro resumo salvo.",
    id: "Belum ada grup tersimpan. Grup sekolah terbaru Anda akan muncul di sini setelah ringkasan pertama disimpan.",
  },
  trustTitle: {
    en: "Trust and retention",
    ar: "الثقة والاحتفاظ",
    es: "Confianza y retención",
    "pt-BR": "Confiança e retenção",
    id: "Kepercayaan dan retensi",
  },
  trustStoredLabel: {
    en: "Stored",
    ar: "يتم حفظه",
    es: "Almacenado",
    "pt-BR": "Armazenado",
    id: "Disimpan",
  },
  trustStoredBody: {
    en: "Saved summaries, saved group names, family memory, and your retention choice.",
    ar: "الملخصات المحفوظة وأسماء المجموعات المحفوظة وذاكرة العائلة وخيار الاحتفاظ الذي اخترته.",
    es: "Resúmenes guardados, nombres de grupos guardados, memoria familiar y tu elección de retención.",
    "pt-BR": "Resumos salvos, nomes de grupos salvos, memória familiar e sua escolha de retenção.",
    id: "Ringkasan tersimpan, nama grup tersimpan, memori keluarga, dan pilihan retensi Anda.",
  },
  trustNotStoredLabel: {
    en: "Not stored",
    ar: "لا يتم حفظه",
    es: "No almacenado",
    "pt-BR": "Não armazenado",
    id: "Tidak disimpan",
  },
  trustNotStoredBody: {
    en: "Raw pasted chat text and raw upload contents after processing.",
    ar: "نص المحادثة الخام الملصق ومحتويات الرفع الخام بعد انتهاء المعالجة.",
    es: "Texto del chat pegado en bruto y contenidos del archivo subido después del procesamiento.",
    "pt-BR": "Texto do chat colado bruto e conteúdo do upload após o processamento.",
    id: "Teks chat mentah yang ditempel dan konten unggahan mentah setelah diproses.",
  },
  trustZipBody: {
    en: "ZIP repeat imports keep message fingerprints only so Fazumi can skip messages it already processed.",
    ar: "تحتفظ استيرادات ZIP المتكررة ببصمات الرسائل فقط حتى يتجاوز Fazumi الرسائل التي عالجها بالفعل.",
    es: "Las importaciones ZIP repetidas solo conservan huellas de mensajes para que Fazumi pueda omitir los mensajes que ya procesó.",
    "pt-BR": "As importações ZIP repetidas mantêm apenas impressões digitais de mensagens para que o Fazumi possa ignorar as mensagens que já processou.",
    id: "Impor ZIP berulang hanya menyimpan sidik jari pesan agar Fazumi dapat melewati pesan yang sudah diproses.",
  },
  trustCta: {
    en: "Open privacy controls",
    ar: "افتح عناصر تحكم الخصوصية",
    es: "Abrir controles de privacidad",
    "pt-BR": "Abrir controles de privacidade",
    id: "Buka kontrol privasi",
  },
  autopilotDigest: {
    en: "Morning digest at the start of the day",
    ar: "ملخص صباحي في بداية اليوم",
    es: "Resumen matutino al inicio del día",
    "pt-BR": "Resumo matinal no início do dia",
    id: "Ringkasan pagi di awal hari",
  },
  autopilotAlerts: {
    en: "Urgent alerts when a school chat needs action fast",
    ar: "تنبيهات عاجلة عندما تحتاج محادثة المدرسة إلى تصرف سريع",
    es: "Alertas urgentes cuando un chat del colegio necesita acción rápida",
    "pt-BR": "Alertas urgentes quando um chat escolar precisa de ação rápida",
    id: "Peringatan mendesak saat chat sekolah memerlukan tindakan cepat",
  },
  autopilotReminders: {
    en: "Reminders seeded from dates, fees, forms, and supplies",
    ar: "تذكيرات مبنية من التواريخ والرسوم والنماذج والمستلزمات",
    es: "Recordatorios generados a partir de fechas, honorarios, formularios y materiales",
    "pt-BR": "Lembretes gerados a partir de datas, taxas, formulários e materiais",
    id: "Pengingat dari tanggal, biaya, formulir, dan perlengkapan",
  },
  autopilotActions: {
    en: "One-click add to calendar or family action list",
    ar: "إضافة بنقرة واحدة إلى التقويم أو قائمة الإجراءات العائلية",
    es: "Un clic para agregar al calendario o a la lista de acciones familiares",
    "pt-BR": "Um clique para adicionar ao calendário ou à lista de ações familiares",
    id: "Satu klik untuk menambahkan ke kalender atau daftar tindakan keluarga",
  },
  autopilotCta: {
    en: "Open dashboard",
    ar: "افتح اللوحة",
    es: "Abrir panel",
    "pt-BR": "Abrir painel",
    id: "Buka dasbor",
  },
  upgradeCta: {
    en: "Upgrade",
    ar: "الترقية",
    es: "Actualizar",
    "pt-BR": "Atualizar",
    id: "Tingkatkan",
  },
} satisfies Record<string, LocalizedCopy<string>>;

function detectDraftLanguage(text: string): "en" | "ar" | null {
  const arabicChars = text.match(/[\u0600-\u06FF]/g)?.length ?? 0;
  const latinChars = text.match(/[A-Za-z]/g)?.length ?? 0;
  const totalAlpha = arabicChars + latinChars;

  if (totalAlpha === 0) {
    return null;
  }

  return arabicChars / totalAlpha >= 0.3 ? "ar" : "en";
}

function buildMilestoneNoticeId(milestone: MilestoneThreshold): SummaryNoticeId {
  return `milestone-${milestone}`;
}

function getMilestoneStorageKey(milestone: MilestoneThreshold, userId: string | null) {
  return userId
    ? `${SUMMARY_MILESTONE_STORAGE_PREFIX}_${milestone}_${userId}`
    : `${SUMMARY_MILESTONE_STORAGE_PREFIX}_${milestone}`;
}

function getDiscoveryStorageKey(userId: string | null) {
  return userId
    ? `${SUMMARY_DISCOVERY_STORAGE_KEY}_${userId}`
    : SUMMARY_DISCOVERY_STORAGE_KEY;
}

export default function SummarizePage() {
  const router = useRouter();
  const { locale, siteLocale } = useLang();
  const isRtl = locale === "ar";
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState<SubmissionSource | null>(null);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [limitCode, setLimitCode] = useState<"DAILY_CAP" | "LIFETIME_CAP">("DAILY_CAP");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [submissionSource, setSubmissionSource] = useState<SubmissionSource>("text");
  const [billingPlan, setBillingPlan] = useState("free");
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [summariesUsed, setSummariesUsed] = useState(0);
  const [summariesLimit, setSummariesLimit] = useState(0);
  const [outputLang, setOutputLang] = useState<OutputLang>(siteLocale === "ar" ? "ar" : "auto");
  const [sourcePlatform, setSourcePlatform] = useState<ImportSourcePlatform>("whatsapp");
  const [sourceLocked, setSourceLocked] = useState(false);
  const [textGroupName, setTextGroupName] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipGroupName, setZipGroupName] = useState("");
  const [zipRange, setZipRange] = useState<SummarizeZipRange>("24h");
  const [summaryCount, setSummaryCount] = useState(0);
  const [summaryNoticeIds, setSummaryNoticeIds] = useState<SummaryNoticeId[]>([]);
  const [savedGroups, setSavedGroups] = useState<SavedGroupOption[]>([]);
  const [savedFamilyContext, setSavedFamilyContext] = useState<FamilyContext | null>(null);
  const [, setSummaryRetentionDays] = useState<number | null>(null);
  const [summaryContextLoaded, setSummaryContextLoaded] = useState(false);
  const [zipResultMeta, setZipResultMeta] = useState<{
    range: SummarizeZipRange;
    groupTitle: string;
    newMessagesProcessed: number;
  } | null>(null);
  const [zipNoNewMessages, setZipNoNewMessages] = useState<{
    range: SummarizeZipRange;
    groupTitle: string;
  } | null>(null);
  const textFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const sessionStartTimeRef = useRef(Date.now());

  const charCount = text.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = charCount > MAX_CHARS;
  const showCount = charCount >= SOFT_COUNT_THRESHOLD;
  const isTextLoading = loading && loadingSource === "text";
  const isZipLoading = loading && loadingSource === "zip";
  const detectedSource = detectImportSource(text);
  const detectedDraftLanguage = detectDraftLanguage(text);
  const sourceWasAutoDetected = Boolean(text.trim()) && !sourceLocked && detectedSource === sourcePlatform;
  const hasSavedMemory = savedFamilyContext ? familyContextHasSignal(savedFamilyContext) : false;
  const savedGroupNameSuggestions = savedFamilyContext?.group_names ?? [];
  const showsUpgradeBenefits = limitCode === "LIFETIME_CAP";
  const upgradeCtaLabel = paymentsComingSoon
    ? withPaymentComingSoonLabel(pick(COPY.upgradeCta, siteLocale), locale)
    : pick(COPY.upgradeCta, siteLocale);
  const limitBenefitLine =
    limitCode === "LIFETIME_CAP"
      ? COPY.limitBenefitLifetime
      : null;
  const limitTitle =
    limitCode === "LIFETIME_CAP"
      ? COPY.limitTitleLifetime
      : isSubscribed === false
        ? COPY.limitTitleDailyFree
        : COPY.limitTitleDailyPaid;
  const limitBody =
    limitCode === "LIFETIME_CAP"
      ? COPY.limitBodyLifetime
      : isSubscribed === false
        ? COPY.limitBodyDailyFree
        : COPY.limitBodyDailyPaid;
  const limitBenefits = showsUpgradeBenefits
    ? [
      COPY.limitBenefitVolume,
      COPY.limitBenefitCalendar,
      COPY.limitBenefitSharing,
      COPY.limitBenefitActions,
    ]
    : [
      COPY.limitBenefitHistory,
      COPY.limitBenefitCalendar,
      COPY.limitBenefitSharing,
      COPY.limitBenefitTomorrow,
    ];
  const remainingSummaries =
    summariesLimit > 0 ? Math.max(summariesLimit - summariesUsed, 0) : null;
  const showNearLimitIndicator =
    summariesLimit > 0 && summariesUsed >= summariesLimit - 1;
  const nearLimitCopy =
    remainingSummaries === 0 ? COPY.nearLimitZero : COPY.nearLimitOne;

  useEffect(() => {
    let mounted = true;

    async function loadPlan() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (!user) {
          if (mounted) {
            setBillingPlan("free");
            setIsSubscribed(false);
            setCurrentUserId(null);
            setSummariesUsed(0);
            setSummariesLimit(0);
            setSummaryCount(0);
            setSavedGroups([]);
            setSavedFamilyContext(null);
            setSummaryRetentionDays(null);
            setSummaryContextLoaded(true);
          }
          return;
        }

        const today = new Date().toISOString().slice(0, 10);
        const [{ data: profile }, { data: subscriptions }, { data: usage }, { count }, { data: groups }] = await Promise.all([
          supabase
            .from("profiles")
            .select("plan, trial_expires_at, family_context, summary_retention_days")
            .eq("id", user.id)
            .maybeSingle<{
              plan: string | null;
              trial_expires_at: string | null;
              family_context: unknown;
              summary_retention_days: number | null;
            }>(),
          supabase
            .from("subscriptions")
            .select("plan_type, status, current_period_end, updated_at, created_at")
            .eq("user_id", user.id),
          supabase
            .from("usage_daily")
            .select("summaries_used")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle<{ summaries_used: number }>(),
          supabase
            .from("summaries")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("deleted_at", null),
          supabase
            .from("chat_groups")
            .select("id, group_title")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(6),
        ]);

        const entitlement = resolveEntitlement({
          profile: {
            plan: profile?.plan ?? "free",
            trial_expires_at: profile?.trial_expires_at ?? null,
          },
          subscriptions: (subscriptions ?? []) as EntitlementSubscription[],
        });

        if (mounted) {
          setBillingPlan(entitlement.billingPlan);
          setIsSubscribed(entitlement.hasPaidAccess);
          setCurrentUserId(user.id);
          setSummariesUsed(usage?.summaries_used ?? 0);
          setSummariesLimit(getDailyLimit(entitlement.tierKey));
          setSummaryCount((currentCount) => Math.max(currentCount, count ?? 0));
          setSavedFamilyContext(normalizeFamilyContext(profile?.family_context));
          setSummaryRetentionDays(normalizeSummaryRetentionDays(profile?.summary_retention_days));
          setSavedGroups(
            ((groups ?? []) as Array<{ id: string; group_title: string | null }>)
              .map((group) => ({
                id: group.id,
                title: group.group_title?.trim() ?? "",
              }))
              .filter((group) => group.title.length > 0)
          );
          setSummaryContextLoaded(true);
        }
      } catch {
        if (mounted) {
          setBillingPlan("free");
          setIsSubscribed(false);
          setCurrentUserId(null);
          setSummariesUsed(0);
          setSummariesLimit(0);
          setSummaryCount(0);
          setSummaryContextLoaded(true);
        }
      }
    }

    void loadPlan();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (sourceLocked || !text.trim()) {
      return;
    }

    const detected = detectImportSource(text);
    if (detected) {
      setSourcePlatform(detected);
    }
  }, [sourceLocked, text]);

  function resetOutputState() {
    setSummary(null);
    setSavedId(null);
    setSummaryNoticeIds([]);
    setZipResultMeta(null);
    setZipNoNewMessages(null);
    setLimitReached(false);
    setLimitCode("DAILY_CAP");
  }

  function scrollToSummary() {
    setTimeout(() => {
      summaryRef.current?.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    }, 100);
  }

  function queueSummaryNotices(nextSummaryCount: number) {
    if (typeof window === "undefined") {
      setSummaryNoticeIds([]);
      return;
    }

    const nextNoticeIds: SummaryNoticeId[] = [];
    const milestone = MILESTONE_THRESHOLDS.find((threshold) => threshold === nextSummaryCount);

    if (milestone) {
      const milestoneStorageKey = getMilestoneStorageKey(milestone, currentUserId);

      if (!window.localStorage.getItem(milestoneStorageKey)) {
        window.localStorage.setItem(milestoneStorageKey, "1");
        trackEvent(AnalyticsEvents.MILESTONE_REACHED, {
          milestone,
          locale,
        });
        nextNoticeIds.push(buildMilestoneNoticeId(milestone));
      }
    }

    if (nextSummaryCount === 5) {
      const discoveryStorageKey = getDiscoveryStorageKey(currentUserId);

      if (!window.localStorage.getItem(discoveryStorageKey)) {
        window.localStorage.setItem(discoveryStorageKey, "1");
        nextNoticeIds.push("discovery-5");
      }
    }

    setSummaryNoticeIds(nextNoticeIds);
  }

  async function applySummaryResult(
    nextSummary: SummaryResult,
    options: {
      source: SubmissionSource;
      savedId?: string | null;
      newMessagesProcessed?: number;
      range?: SummarizeZipRange;
      groupTitle?: string;
    }
  ) {
    setSubmissionSource(options.source);
    setSummary(nextSummary);
    setSavedId(options.savedId ?? null);
    setZipNoNewMessages(null);
    setZipResultMeta(
      options.source === "zip" && options.range
        ? {
          range: options.range,
          groupTitle: (options.groupTitle ?? zipGroupName.trim()) || inferGroupLabelFromFilename(zipFile?.name ?? "chat.zip"),
          newMessagesProcessed: options.newMessagesProcessed ?? 0,
        }
        : null
    );
    haptic("success");
    trackEvent(AnalyticsEvents.SUMMARY_CREATED, {
      charCount: nextSummary.char_count,
      langPref: outputLang,
      saved: Boolean(options.savedId),
      outputLang: outputLang === "auto" ? nextSummary.lang_detected : outputLang,
      source: options.source,
    });

    if (
      summaryContextLoaded &&
      summaryCount === 0 &&
      options.savedId
    ) {
      trackEvent(AnalyticsEvents.FIRST_VALUE_DELIVERED, {
        seconds_to_first_summary: Math.max(
          0,
          Math.round((Date.now() - sessionStartTimeRef.current) / 1000)
        ),
        char_count:
          options.source === "text"
            ? text.length
            : nextSummary.char_count,
        has_family_context: Boolean(hasSavedMemory),
        locale,
      });
    }

    const nextGroupTitle =
      options.source === "zip"
        ? (options.groupTitle ?? zipGroupName.trim())
        : textGroupName.trim();
    if (nextGroupTitle) {
      trackEvent(AnalyticsEvents.GROUP_SAVED, {
        groupTitle: nextGroupTitle,
        source: options.source,
        sourcePlatform: options.source === "zip" ? "whatsapp" : sourcePlatform,
      });
    }

    if (options.savedId) {
      const nextSummaryCount = summaryCount + 1;
      setSummaryCount(nextSummaryCount);
      setSummariesUsed((currentUsed) => currentUsed + 1);
      if (summaryContextLoaded) {
        queueSummaryNotices(nextSummaryCount);
      } else {
        setSummaryNoticeIds([]);
      }
      emitDashboardInsightsRefresh();
      window.dispatchEvent(new Event("fazumi-todos-changed"));
    }

    if (currentUserId && nextSummary.action_items.length > 0) {
      const health = await getClientHealthSnapshot();
      if (getTodoStorageMode(health) === "local") {
        mergeLocalTodoLabels(currentUserId, nextSummary.action_items);
        window.dispatchEvent(new Event("fazumi-todos-changed"));
      }
    }

    scrollToSummary();
  }

  function resolveZipError(payload: ZipApiResponse) {
    const errPayload = payload as { error?: string; code?: string };

    if (errPayload.code === "INVALID_FILE") {
      return pick(COPY.fileTooLarge, siteLocale);
    }

    if (errPayload.code === "UNSUPPORTED_FILE") {
      return pick(COPY.unsupportedFile, siteLocale);
    }

    if (errPayload.code === "NO_TEXT_FILES") {
      return pick(COPY.noTextFiles, siteLocale);
    }

    if (errPayload.code === "PARSE_FAILED") {
      return pick(COPY.zipParseError, siteLocale);
    }

    if (errPayload.code === "INVALID_ZIP" || errPayload.code === "ZIP_TEXT_READ_FAILED") {
      return pick(COPY.fileReadError, siteLocale);
    }

    return errPayload.error ?? pick(COPY.unknownError, siteLocale);
  }

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    haptic("medium");

    if (!text.trim() || loading || isOverLimit) {
      return;
    }

    setLoading(true);
    setLoadingSource("text");
    setError(null);
    resetOutputState();

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          lang_pref: outputLang,
          ui_locale: siteLocale,
          source_platform: sourcePlatform,
          group_name: textGroupName.trim(),
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 402) {
        const payload = (await response.json().catch(() => ({}))) as { code?: string };
        const code = payload.code === "LIFETIME_CAP" ? "LIFETIME_CAP" : "DAILY_CAP";
        setLimitCode(code);
        setLimitReached(true);
        trackEvent(AnalyticsEvents.LIMIT_REACHED, { code });
        return;
      }

      const payload = (await response.json()) as {
        summary?: SummaryResult;
        savedId?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.summary) {
        setError(payload.error ?? pick(COPY.unknownError, siteLocale));
        haptic("error");
        return;
      }

      await applySummaryResult(payload.summary, {
        source: "text",
        savedId: payload.savedId,
      });
    } catch {
      setError(pick(COPY.networkError, siteLocale));
      haptic("error");
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
  }

  async function handleTextFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    event.target.value = "";
    setError(null);

    if (file.size > 10 * 1024 * 1024) {
      setError(pick(COPY.fileTooLarge, siteLocale));
      return;
    }

    try {
      if (file.name.endsWith(".txt")) {
        const content = await file.text();
        setText(content.slice(0, MAX_CHARS));
        return;
      }

      setError(pick(COPY.unsupportedFile, siteLocale));
    } catch {
      setError(pick(COPY.fileReadError, siteLocale));
    }
  }

  function handleZipFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    event.target.value = "";
    setError(null);
    setZipNoNewMessages(null);

    if (file.size > 10 * 1024 * 1024) {
      setError(pick(COPY.fileTooLarge, siteLocale));
      return;
    }

    if (!file.name.endsWith(".zip")) {
      setError(pick(COPY.unsupportedFile, siteLocale));
      return;
    }

    setZipFile(file);
    setZipGroupName(inferGroupLabelFromFilename(file.name));
  }

  async function handleZipSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    haptic("medium");

    if (!zipFile || loading) {
      setError(pick(COPY.zipSelectFirst, siteLocale));
      haptic("error");
      return;
    }

    setLoading(true);
    setLoadingSource("zip");
    setError(null);
    resetOutputState();

    try {
      const formData = new FormData();
      formData.append("file", zipFile);
      formData.append("range", zipRange);
      formData.append("group_name", zipGroupName.trim());
      formData.append("lang_pref", outputLang);
      formData.append("ui_locale", siteLocale);

      const response = await fetch("/api/summarize-zip", {
        method: "POST",
        body: formData,
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 402) {
        const payload = (await response.json().catch(() => ({}))) as { code?: string };
        const code = payload.code === "LIFETIME_CAP" ? "LIFETIME_CAP" : "DAILY_CAP";
        setLimitCode(code);
        setLimitReached(true);
        trackEvent(AnalyticsEvents.LIMIT_REACHED, { code, source: "zip" });
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as ZipApiResponse;

      if (!response.ok) {
        setError(resolveZipError(payload));
        haptic("error");
        return;
      }

      if (payload.status === "no_new_messages") {
        setSubmissionSource("zip");
        setZipNoNewMessages({
          range: payload.range,
          groupTitle:
            payload.group?.title?.trim() ||
            zipGroupName.trim() ||
            inferGroupLabelFromFilename(zipFile.name),
        });
        haptic("success");
        return;
      }

      if (payload.status !== "ok" || !payload.summary) {
        setError(resolveZipError(payload));
        haptic("error");
        return;
      }

      await applySummaryResult(payload.summary, {
        source: "zip",
        savedId: payload.savedId,
        newMessagesProcessed: payload.newMessagesProcessed,
        range: payload.range,
        groupTitle:
          payload.group?.title?.trim() ||
          zipGroupName.trim() ||
          inferGroupLabelFromFilename(zipFile.name),
      });
    } catch {
      setError(pick(COPY.networkError, siteLocale));
      haptic("error");
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  }

  const resolvedSummaryLocale =
    outputLang === "auto"
      ? (summary?.lang_detected === "ar" || summary?.lang_detected === "ur" ? "ar" : "en")
      : (outputLang === "ar" || outputLang === "ur" ? "ar" : "en");
  const selectedOutputLanguage =
    OUTPUT_LANGUAGE_OPTIONS.find((option) => option.value === outputLang) ?? OUTPUT_LANGUAGE_OPTIONS[0];
  const selectedSource =
    SOURCE_OPTIONS.find((option) => option.value === sourcePlatform) ?? SOURCE_OPTIONS[0];

  function handleSourceSelect(option: ImportSourcePlatform) {
    setSourceLocked(true);
    setSourcePlatform(option);
    trackEvent(AnalyticsEvents.SOURCE_SELECTED, {
      sourcePlatform: option,
      manual: true,
    });
  }

  function renderOutputLanguageButtons(testIdPrefix: string) {
    return (
      <div
        className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1"
        role="group"
        aria-label={pick(COPY.outputLanguage, siteLocale)}
      >
        {OUTPUT_LANGUAGE_OPTIONS.map((option) => {
          const active = outputLang === option.value;

          return (
            <button
              key={option.value}
              type="button"
              data-testid={`${testIdPrefix}-${option.value}`}
              aria-pressed={active}
              onClick={() => setOutputLang(option.value)}
              disabled={loading}
              className={cn(
                "min-h-10 rounded-full px-4 text-[var(--text-sm)] font-semibold transition-colors",
                active
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-xs)]"
                  : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
                loading && "cursor-not-allowed opacity-60"
              )}
            >
              {pick(option.label, siteLocale)}
            </button>
          );
        })}
      </div>
    );
  }

  function renderSourceButtons(testIdPrefix: string) {
    return (
      <div
        className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1"
        role="group"
        aria-label={pick(COPY.sourceTitle, siteLocale)}
      >
        {SOURCE_OPTIONS.map((option) => {
          const active = sourcePlatform === option.value;

          return (
            <button
              key={option.value}
              type="button"
              data-testid={`${testIdPrefix}-${option.value}`}
              aria-pressed={active}
              onClick={() => handleSourceSelect(option.value)}
              disabled={loading}
              className={cn(
                "min-h-10 rounded-full px-4 text-[var(--text-sm)] font-semibold transition-colors",
                active
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-xs)]"
                  : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
                loading && "cursor-not-allowed opacity-60"
              )}
            >
              {pick(option.label, siteLocale)}
            </button>
          );
        })}
      </div>
    );
  }

  function renderSourceStatusPills() {
    return (
      <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
        {sourceWasAutoDetected && (
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
            {pick(COPY.sourceAutoDetected, siteLocale)}
          </span>
        )}
        {detectedDraftLanguage && (
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
            {pick(COPY.detectedLanguage, siteLocale)}:{" "}
            {pick(detectedDraftLanguage === "ar" ? COPY.detectedArabic : COPY.detectedEnglish, siteLocale)}
          </span>
        )}
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
          {pick(COPY.importFit, siteLocale)}
        </span>
      </div>
    );
  }

  return (
    <DashboardShell contentClassName="max-w-[92rem]">
      <FounderWelcomeModal isFounder={billingPlan === "founder"} />
      <PmfSurveyModal summaryCount={summaryCount} />
      <div
        dir={isRtl ? "rtl" : "ltr"}
        lang={locale}
        className={cn("space-y-5", isRtl && "font-arabic")}
      >
        {hasSavedMemory && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--primary)]">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>
              {locale === "ar"
                ? "Fazumi يعرف عائلتك — ملخصاتك مخصصة لك."
                : "Fazumi knows your family — summaries are personalised for you."}
            </span>
          </div>
        )}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)] xl:items-start">
          <div className="space-y-4">
        <Card className="bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                <h1 className="text-[var(--text-lg)] font-semibold text-[var(--foreground)]">
                  {pick(COPY.title, siteLocale)}
                </h1>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-[15px]">
                {pick(COPY.subtitle, siteLocale)}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]">
                <Textarea
                  data-testid="summary-input"
                  aria-label={pick(COPY.title, siteLocale)}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={pick(COPY.placeholder, siteLocale)}
                  rows={12}
                  disabled={loading}
                  className={cn(
                    "min-h-[300px] resize-none border-0 bg-transparent px-4 py-4 text-[var(--text-base)] leading-relaxed shadow-none focus-visible:ring-0 lg:min-h-[340px]",
                    isOverLimit && "bg-[var(--destructive-soft)]"
                  )}
                />
                {showCount && (
                  <div className="flex items-center justify-end border-t border-[var(--border)] px-4 py-2.5 text-sm">
                    <span
                      className={cn(
                        "tabular-nums",
                        isOverLimit
                          ? "font-semibold text-[var(--destructive)]"
                          : remaining < 1500
                            ? "text-[var(--warning)]"
                            : "text-[var(--muted-foreground)]"
                      )}
                    >
                      {formatNumber(charCount)} / {formatNumber(MAX_CHARS)} {pick(COPY.charCount, siteLocale)}
                    </span>
                  </div>
                )}
              </div>

              {isOverLimit && (
                <div className="status-destructive rounded-[var(--radius)] border px-4 py-3 text-sm" role="alert" aria-live="polite">
                  {pick(COPY.textTooLong, siteLocale)}
                </div>
              )}

              <Accordion
                type="single"
                collapsible
                className="xl:hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-4"
              >
                <AccordionItem value="quick-options" className="border-0">
                  <AccordionTrigger className="py-3 text-start hover:text-[var(--foreground)]">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          {pick(COPY.quickOptionsTitle, siteLocale)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {pick(COPY.quickOptionsHint, siteLocale)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 font-medium text-[var(--foreground)]">
                          {pick(COPY.outputLanguage, siteLocale)}: {pick(selectedOutputLanguage.label, siteLocale)}
                        </span>
                        <span className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 font-medium text-[var(--foreground)]">
                          {pick(COPY.sourceTitle, siteLocale)}: {pick(selectedSource.label, siteLocale)}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="grid gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                            {pick(COPY.outputLanguage, siteLocale)}
                          </p>
                          <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                            {pick(COPY.outputLanguageHint, siteLocale)}
                          </p>
                        </div>
                        {renderOutputLanguageButtons("summary-mobile-lang")}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                            {pick(COPY.sourceTitle, siteLocale)}
                          </p>
                          <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                            {pick(COPY.sourceHint, siteLocale)}
                          </p>
                        </div>
                        {renderSourceButtons("summary-mobile-source")}
                        {renderSourceStatusPills()}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={textFileInputRef}
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={handleTextFileChange}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => textFileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4" />
                    {pick(COPY.uploadText, siteLocale)}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid="summary-use-sample"
                    onClick={() => setText(getSampleChat(outputLang, locale, sourcePlatform))}
                    disabled={loading}
                  >
                    {pick(COPY.useSample, siteLocale)}
                  </Button>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  data-testid="summary-submit"
                  className="h-12 w-full px-8 sm:w-auto"
                  disabled={loading || !text.trim() || isOverLimit}
                >
                  {isTextLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {pick(COPY.summarizing, siteLocale)}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      {pick(COPY.summarize, siteLocale)}
                    </>
                  )}
                </Button>
              </div>
              {showNearLimitIndicator && (
                <p
                  data-testid="summary-near-limit-indicator"
                  className="sm:hidden text-center text-xs text-[var(--muted-foreground)]"
                >
                  {pick(nearLimitCopy, siteLocale)}
                </p>
              )}
              <p className="text-center text-xs text-[var(--muted-foreground)]">
                {pick(COPY.privacy, siteLocale)}
              </p>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="status-destructive rounded-[var(--radius-xl)] border px-4 py-3 text-sm" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {limitReached && (
          <div
            data-testid="summary-limit-banner"
            className="status-warning flex items-start gap-3 rounded-[var(--radius-xl)] border px-4 py-4"
            role="alert"
            aria-live="polite"
          >
            <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {pick(limitTitle, siteLocale)}
              </p>
              <p className="mt-1 text-sm text-[var(--foreground)]/80">
                {pick(limitBody, siteLocale)}
              </p>
              {limitBenefitLine && (
                <p className="mt-2 text-sm text-[var(--foreground)]/80">
                  {pick(limitBenefitLine, siteLocale)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {limitBenefits.map((benefit) => (
                  <span
                    key={benefit.en}
                    className="rounded-full border border-current/15 bg-white/70 px-2.5 py-1 text-xs font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                  >
                    {pick(benefit, siteLocale)}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {showsUpgradeBenefits && (
                  <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    {upgradeCtaLabel}
                  </Link>
                )}
                <Link
                  href="/history"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {pick(COPY.viewHistory, siteLocale)}
                </Link>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <div ref={summaryRef} className="space-y-3">
            {submissionSource === "zip" && zipResultMeta && (
              <div
                data-testid="zip-processed-banner"
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm"
                role="status"
                aria-live="polite"
              >
                <p className="font-semibold text-[var(--foreground)]">
                  {pick(COPY.zipProcessed, siteLocale)}: {formatNumber(zipResultMeta.newMessagesProcessed)}
                </p>
                <p className="mt-1 text-[var(--muted-foreground)]">
                  {zipResultMeta.groupTitle}
                  {" • "}
                  {pick(
                    ZIP_RANGE_OPTIONS.find((option) => option.value === zipResultMeta.range)?.label ?? ZIP_RANGE_OPTIONS[0].label,
                    siteLocale
                  )}
                </p>
              </div>
            )}
            {savedId && (
              <div
                data-testid="summary-saved-banner"
                className="status-success flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-sm"
                role="status"
                aria-live="polite"
              >
                <Check className="h-4 w-4 shrink-0" />
                <span>{pick(COPY.saved, siteLocale)}</span>
                <a
                  href={`/history/${savedId}`}
                  className="ms-auto text-xs underline hover:no-underline"
                >
                  {pick(COPY.view, siteLocale)} →
                </a>
              </div>
            )}
            <SummaryDisplay
              summary={summary}
              outputLang={resolvedSummaryLocale}
              familyContextActive={hasSavedMemory}
              inlineNoticeIds={summaryNoticeIds}
              onDismissNotice={(noticeId) => {
                setSummaryNoticeIds((currentNoticeIds) => currentNoticeIds.filter((currentNoticeId) => currentNoticeId !== noticeId));
              }}
              actionMode={isSubscribed === null ? "disabled" : isSubscribed ? "active" : "gated"}
            />
            <FollowUpPanel
              summary={summary}
              locale={resolvedSummaryLocale}
            />
          </div>
        )}
          </div>

          <div className="space-y-4 xl:sticky xl:top-6">

        <Card className="hidden bg-[var(--surface-elevated)] shadow-[var(--shadow-card)] xl:block">
          <CardContent className="space-y-3 p-6 text-start">
            <div>
              <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                {pick(COPY.outputLanguage, siteLocale)}
              </p>
              <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                {pick(COPY.outputLanguageHint, siteLocale)}
              </p>
            </div>
            {renderOutputLanguageButtons("summary-lang")}
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
          <CardContent className="space-y-5 p-6 text-start">
            <div className="space-y-2">
              <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                {pick(COPY.setupTitle, siteLocale)}
              </p>
              <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                {pick(COPY.setupHint, siteLocale)}
              </p>
            </div>

            <div className="hidden space-y-3 xl:block">
              <div>
                <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                  {pick(COPY.sourceTitle, siteLocale)}
                </p>
                <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                  {pick(COPY.sourceHint, siteLocale)}
                </p>
              </div>
              {renderSourceButtons("summary-source")}
              {renderSourceStatusPills()}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="summary-group-name" className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                  {pick(COPY.groupName, siteLocale)}
                </label>
                <Input
                  id="summary-group-name"
                  data-testid="summary-group-input"
                  value={textGroupName}
                  onChange={(event) => setTextGroupName(event.target.value)}
                  placeholder={pick(COPY.groupNamePlaceholder, siteLocale)}
                  disabled={loading}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  list="group-name-suggestions"
                />
                <datalist id="group-name-suggestions">
                  {savedGroupNameSuggestions.map((groupName) => (
                    <option key={groupName} value={groupName} />
                  ))}
                </datalist>
                <p className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
                  {pick(COPY.groupHint, siteLocale)}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                  {pick(COPY.savedGroups, siteLocale)}
                </p>
                <p className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
                  {savedGroups.length > 0 ? pick(COPY.savedGroupsHint, siteLocale) : pick(COPY.noSavedGroups, siteLocale)}
                </p>
                {savedGroups.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {savedGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setTextGroupName(group.title);
                          trackEvent(AnalyticsEvents.GROUP_SAVED, {
                            groupTitle: group.title,
                            source: "text",
                            reused: true,
                          });
                        }}
                        className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
                      >
                        {group.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
          <CardContent className="p-6">
            <form onSubmit={handleZipSubmit} className="space-y-5">
              <div className="space-y-2 text-start">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-[var(--primary)]" />
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                    {pick(COPY.zipSection, siteLocale)}
                  </p>
                </div>
                <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                  {pick(COPY.zipSectionHint, siteLocale)}
                </p>
                <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                  {pick(COPY.zipPrivacy, siteLocale)}
                </p>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                      {pick(COPY.zipSelectedFile, siteLocale)}
                    </p>
                    <p
                      data-testid="zip-selected-file"
                      className="mt-1 truncate text-[var(--text-sm)] text-[var(--muted-foreground)]"
                    >
                      {zipFile?.name ?? pick(COPY.zipNoFile, siteLocale)}
                    </p>
                  </div>

                  <input
                    ref={zipFileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleZipFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="zip-select-file"
                    onClick={() => zipFileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <Archive className="h-4 w-4" />
                    {pick(COPY.uploadZip, siteLocale)}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 text-start">
                  <label htmlFor="zip-group-name" className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                    {pick(COPY.zipGroupName, siteLocale)}
                  </label>
                  <Input
                    id="zip-group-name"
                    data-testid="zip-group-input"
                    value={zipGroupName}
                    onChange={(event) => setZipGroupName(event.target.value)}
                    placeholder={pick(COPY.groupNamePlaceholder, siteLocale)}
                    disabled={loading}
                  />
                  <p className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
                    {pick(COPY.zipGroupHint, siteLocale)}
                  </p>
                </div>

                <div className="space-y-2 text-start">
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                    {pick(COPY.zipRange, siteLocale)}
                  </p>
                  <div
                    className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1"
                    role="group"
                    aria-label={pick(COPY.zipRange, siteLocale)}
                  >
                    {ZIP_RANGE_OPTIONS.map((option) => {
                      const active = zipRange === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          data-testid={`zip-range-${option.value}`}
                          aria-pressed={active}
                          onClick={() => setZipRange(option.value)}
                          disabled={loading}
                          className={cn(
                            "min-h-10 rounded-full px-4 text-[var(--text-sm)] font-semibold transition-colors",
                            active
                              ? "bg-[var(--primary)] text-white shadow-[var(--shadow-xs)]"
                              : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
                            loading && "cursor-not-allowed opacity-60"
                          )}
                        >
                          {pick(option.label, siteLocale)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <Button
                  type="submit"
                  size="lg"
                  data-testid="zip-submit"
                  className="h-12 w-full sm:w-auto"
                  disabled={loading || !zipFile}
                >
                  {isZipLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {pick(COPY.zipSubmitting, siteLocale)}
                    </>
                  ) : (
                    <>
                      <Archive className="h-5 w-5" />
                      {pick(COPY.zipSubmit, siteLocale)}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {zipNoNewMessages && (
          <div
            data-testid="zip-no-new-messages"
            className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {pick(COPY.zipNoNewMessages, siteLocale)}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {zipNoNewMessages.groupTitle}
              {" • "}
              {pick(
                ZIP_RANGE_OPTIONS.find((option) => option.value === zipNoNewMessages.range)?.label ?? ZIP_RANGE_OPTIONS[0].label,
                siteLocale
              )}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {pick(COPY.zipNoNewMessagesHint, siteLocale)}
            </p>
          </div>
        )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}





