"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useConsentManager } from "@/components/compliance/ConsentManager";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { getDefaultConsent, type ConsentPreferences } from "@/lib/compliance/gdpr";
import { useLang } from "@/lib/context/LangContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { formatDate } from "@/lib/format";
import { resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import { dispatchProfileUpdated } from "@/lib/profile-events";
import type { WebPushSubscriptionPayload } from "@/lib/push/types";
import {
  getEmptyFamilyContext,
  normalizeFamilyContext,
  normalizeSummaryRetentionDays,
  type FamilyContext,
  type FamilyGroupType,
  type SupportedCurrency,
} from "@/lib/family-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  BellRing,
  Brain,
  Camera,
  Check,
  Clock3,
  Globe,
  LifeBuoy,
  LoaderCircle,
  Moon,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  UserCircle,
} from "lucide-react";

import type { SiteLocale } from "@/lib/i18n";
type Locale = SiteLocale;
type ProfilePatch = {
  theme_pref?: string;
  lang_pref?: string;
  family_context?: FamilyContext;
  summary_retention_days?: number | null;
  full_name?: string;
  avatar_url?: string;
  timezone?: string | null;
};

type FounderSinceCopy = {
  en: string;
  ar: string;
};

type PushFeedbackState = "enabled" | "disabled" | "error" | "permissionDenied";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
const AVATAR_ACCEPT = "image/gif,image/jpeg,image/png,image/webp";
const MAX_AVATAR_FILE_BYTES = 2 * 1024 * 1024;
const SUPPORTED_AVATAR_TYPES = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);

const GROUP_TYPE_OPTIONS: Array<{ value: FamilyGroupType; en: string; ar: string; es: string; "pt-BR": string; id: string }> = [
  { value: "class", en: "Class chat", ar: "مجموعة الصف", es: "Chat de clase", "pt-BR": "Chat da turma", id: "Obrolan kelas" },
  { value: "grade", en: "Grade chat", ar: "مجموعة المرحلة", es: "Chat de grado", "pt-BR": "Chat do ano", id: "Obrolan angkatan" },
  { value: "school", en: "School chat", ar: "مجموعة المدرسة", es: "Chat escolar", "pt-BR": "Chat da escola", id: "Obrolan sekolah" },
  { value: "activity", en: "Activity chat", ar: "مجموعة النشاط", es: "Chat de actividad", "pt-BR": "Chat de atividade", id: "Obrolan aktivitas" },
  { value: "transport", en: "Transport chat", ar: "مجموعة النقل", es: "Chat de transporte", "pt-BR": "Chat de transporte", id: "Obrolan transportasi" },
  { value: "other", en: "Other", ar: "أخرى", es: "Otro", "pt-BR": "Outro", id: "Lainnya" },
];

const CURRENCY_OPTIONS: SupportedCurrency[] = [
  "SAR",
  "AED",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "USD",
];

const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Asia/Riyadh", label: "Riyadh / Doha / Kuwait (UTC+3)" },
  { value: "Asia/Dubai", label: "Dubai / Abu Dhabi (UTC+4)" },
  { value: "Asia/Muscat", label: "Muscat (UTC+4)" },
  { value: "Asia/Bahrain", label: "Bahrain (UTC+3)" },
  { value: "Asia/Kuwait", label: "Kuwait (UTC+3)" },
  { value: "Europe/London", label: "London (UTC+0/+1)" },
  { value: "America/New_York", label: "New York (UTC-5/-4)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8/-7)" },
  { value: "Asia/Karachi", label: "Karachi (UTC+5)" },
  { value: "Asia/Kolkata", label: "Mumbai / Delhi (UTC+5:30)" },
  { value: "Africa/Cairo", label: "Cairo (UTC+2/+3)" },
];

const COPY = {
  title: { en: "Settings", ar: "الإعدادات", es: "Configuración", "pt-BR": "Configurações", id: "Pengaturan" },
  description: {
    en: "Adjust language, family memory, privacy, retention, and support from one place.",
    ar: "اضبط اللغة وذاكرة العائلة والخصوصية ومدة الاحتفاظ والدعم من مكان واحد.",
    es: "Ajusta el idioma, la memoria familiar, la privacidad, la retención y el soporte desde un solo lugar.",
    "pt-BR": "Ajuste idioma, memória familiar, privacidade, retenção e suporte em um só lugar.",
    id: "Atur bahasa, memori keluarga, privasi, retensi, dan dukungan dari satu tempat.",
  },
  themeTitle: { en: "Appearance", ar: "المظهر", es: "Apariencia", "pt-BR": "Aparência", id: "Tampilan" },
  themeBody: { en: "Switch between light and dark.", ar: "بدّل بين الوضع الفاتح والداكن.", es: "Cambia entre modo claro y oscuro.", "pt-BR": "Alterne entre claro e escuro.", id: "Ganti antara terang dan gelap." },
  light: { en: "Light", ar: "فاتح", es: "Claro", "pt-BR": "Claro", id: "Terang" },
  dark: { en: "Dark", ar: "داكن", es: "Oscuro", "pt-BR": "Escuro", id: "Gelap" },
  languageTitle: { en: "Language", ar: "اللغة", es: "Idioma", "pt-BR": "Idioma", id: "Bahasa" },
  languageBody: {
    en: "Choose your preferred language. This also sets the default output language for your summaries.",
    ar: "اختر لغتك المفضلة. يحدد هذا أيضًا لغة مخرجات الملخص الافتراضية.",
    es: "Elige tu idioma preferido. Esto también establece el idioma de salida predeterminado para tus resúmenes.",
    "pt-BR": "Escolha seu idioma preferido. Isso também define o idioma padrão de saída dos seus resumos.",
    id: "Pilih bahasa pilihan Anda. Ini juga menetapkan bahasa keluaran default untuk ringkasan Anda.",
  },
  memoryTitle: { en: "Family memory", ar: "ذاكرة العائلة", es: "Memoria familiar", "pt-BR": "Memória familiar", id: "Memori keluarga" },
  memoryBody: {
    en: "Save school, child, class, teacher names, group type, recurring links, and currency so repeat imports get better on the second and third use.",
    ar: "احفظ المدرسة والطفل والصف وأسماء المعلمين ونوع المجموعة والروابط المتكررة والعملة حتى تتحسن الاستيرادات المتكررة في الاستخدام الثاني والثالث.",
    es: "Guarda el nombre del colegio, del hijo/a, del aula, de los profesores, el tipo de grupo, los enlaces recurrentes y la moneda para que las importaciones repetidas mejoren.",
    "pt-BR": "Salve nome da escola, filho(a), turma, professores, tipo de grupo, links recorrentes e moeda para que as importações repetidas melhorem.",
    id: "Simpan nama sekolah, anak, kelas, guru, jenis grup, tautan berulang, dan mata uang agar impor berulang semakin baik.",
  },
  school: { en: "School name", ar: "اسم المدرسة", es: "Nombre del colegio", "pt-BR": "Nome da escola", id: "Nama sekolah" },
  child: { en: "Child name", ar: "اسم الطفل", es: "Nombre del hijo/a", "pt-BR": "Nome do filho(a)", id: "Nama anak" },
  className: { en: "Class or grade", ar: "الصف أو المرحلة", es: "Clase o grado", "pt-BR": "Turma ou série", id: "Kelas atau tingkat" },
  groupType: { en: "Group type", ar: "نوع المجموعة", es: "Tipo de grupo", "pt-BR": "Tipo de grupo", id: "Jenis grup" },
  teachers: { en: "Teacher names", ar: "أسماء المعلمين", es: "Nombres de los profesores", "pt-BR": "Nomes dos professores", id: "Nama guru" },
  teachersHint: {
    en: "One per line or separated by commas.",
    ar: "اسم واحد في كل سطر أو افصل بينها بفواصل.",
    es: "Un nombre por línea o separados por comas.",
    "pt-BR": "Um por linha ou separados por vírgulas.",
    id: "Satu per baris atau dipisahkan dengan koma.",
  },
  groupNames: { en: "School group names", ar: "أسماء مجموعات المدرسة", es: "Nombres de grupos escolares", "pt-BR": "Nomes dos grupos escolares", id: "Nama grup sekolah" },
  groupNamesHint: {
    en: "One group name per line, e.g. Grade 3B WhatsApp",
    ar: "اسم مجموعة واحد في كل سطر، مثال: واتساب الصف الثالث ب",
    es: "Un nombre de grupo por línea, p. ej. WhatsApp 3.° B",
    "pt-BR": "Um nome de grupo por linha, ex.: WhatsApp 3.º B",
    id: "Satu nama grup per baris, mis. WhatsApp Kelas 3B",
  },
  links: { en: "Recurring links", ar: "الروابط المتكررة", es: "Enlaces recurrentes", "pt-BR": "Links recorrentes", id: "Tautan berulang" },
  linksHint: {
    en: "Portal, fee, form, or classroom links you reuse often.",
    ar: "روابط البوابة أو الرسوم أو النماذج أو الصف التي تستخدمها كثيرًا.",
    es: "Portal, cuotas, formularios o enlaces de aula que usas con frecuencia.",
    "pt-BR": "Links de portal, taxas, formulários ou sala de aula que você usa com frequência.",
    id: "Tautan portal, biaya, formulir, atau kelas yang sering Anda gunakan.",
  },
  currency: { en: "Preferred currency", ar: "العملة المفضلة", es: "Moneda preferida", "pt-BR": "Moeda preferida", id: "Mata uang pilihan" },
  saveMemory: { en: "Save family memory", ar: "احفظ ذاكرة العائلة", es: "Guardar memoria familiar", "pt-BR": "Salvar memória familiar", id: "Simpan memori keluarga" },
  memorySavedConfirmation: {
    en: "Saved — your future summaries will reflect this context.",
    ar: "تم الحفظ — ستعكس ملخصاتك المستقبلية هذا السياق.",
    es: "Guardado — tus futuros resúmenes reflejarán este contexto.",
    "pt-BR": "Salvo — seus próximos resumos refletirão este contexto.",
    id: "Tersimpan — ringkasan Anda berikutnya akan mencerminkan konteks ini.",
  },
  trustTitle: { en: "Trust and retention", ar: "الثقة ومدة الاحتفاظ", es: "Confianza y retención", "pt-BR": "Confiança e retenção", id: "Kepercayaan dan retensi" },
  trustBody: {
    en: "Make storage rules obvious and let families control how long summaries stay in the account.",
    ar: "اجعل قواعد التخزين واضحة واسمح للعائلات بالتحكم في مدة بقاء الملخصات داخل الحساب.",
    es: "Haz que las reglas de almacenamiento sean claras y permite que las familias controlen cuánto tiempo permanecen los resúmenes en la cuenta.",
    "pt-BR": "Torne as regras de armazenamento claras e permita que as famílias controlem por quanto tempo os resumos ficam na conta.",
    id: "Buat aturan penyimpanan jelas dan biarkan keluarga mengontrol berapa lama ringkasan tersimpan di akun.",
  },
  stored: { en: "Stored", ar: "يتم حفظه", es: "Almacenado", "pt-BR": "Armazenado", id: "Tersimpan" },
  storedBody: {
    en: "Saved summaries, action items, dates, saved group names, family memory, PMF responses, and your retention rule.",
    ar: "الملخصات المحفوظة وعناصر الإجراءات والتواريخ وأسماء المجموعات المحفوظة وذاكرة العائلة وردود PMF وقاعدة الاحتفاظ.",
    es: "Resúmenes guardados, elementos de acción, fechas, nombres de grupos guardados, memoria familiar, respuestas PMF y tu regla de retención.",
    "pt-BR": "Resumos salvos, itens de ação, datas, nomes de grupos salvos, memória familiar, respostas PMF e sua regra de retenção.",
    id: "Ringkasan tersimpan, item tindakan, tanggal, nama grup tersimpan, memori keluarga, respons PMF, dan aturan retensi Anda.",
  },
  notStored: { en: "Not stored", ar: "لا يتم حفظه", es: "No almacenado", "pt-BR": "Não armazenado", id: "Tidak tersimpan" },
  notStoredBody: {
    en: "Raw pasted chat text after summarization. Notification permission stays at the browser or device level.",
    ar: "نص المحادثة الخام بعد التلخيص. ويظل إذن الإشعارات على مستوى المتصفح أو الجهاز.",
    es: "Texto del chat pegado sin procesar después del resumen. El permiso de notificación permanece en el nivel del navegador o dispositivo.",
    "pt-BR": "Texto do chat colado sem processamento após o resumo. A permissão de notificação fica no nível do navegador ou dispositivo.",
    id: "Teks obrolan mentah setelah peringkasan. Izin notifikasi tetap di level browser atau perangkat.",
  },
  retention: { en: "Summary retention", ar: "مدة الاحتفاظ بالملخصات", es: "Retención de resúmenes", "pt-BR": "Retenção de resumos", id: "Retensi ringkasan" },
  retentionHint: {
    en: "Saving this setting deletes older summaries outside the selected window.",
    ar: "حفظ هذا الإعداد يحذف الملخصات الأقدم خارج المدة المحددة.",
    es: "Guardar esta configuración elimina los resúmenes más antiguos fuera de la ventana seleccionada.",
    "pt-BR": "Salvar esta configuração exclui os resumos mais antigos fora do período selecionado.",
    id: "Menyimpan pengaturan ini akan menghapus ringkasan yang lebih lama di luar periode yang dipilih.",
  },
  notificationsTitle: { en: "Notifications", ar: "الإشعارات", es: "Notificaciones", "pt-BR": "Notificações", id: "Notifikasi" },
  notificationsBody: {
    en: "Control the 7 AM school notifications, including daily digests, a quiet Sunday weekly recap, and one gentle reminder after a long gap.",
    ar: "تحكم في إشعارات المدرسة عند الساعة 7 صباحًا، وتشمل الملخص اليومي وملخص الأحد الأسبوعي الهادئ وتذكيرًا لطيفًا واحدًا بعد انقطاع طويل.",
    es: "Controla las notificaciones escolares de las 7 a. m., incluidos los resúmenes diarios, un resumen semanal tranquilo del domingo y un recordatorio suave tras una larga pausa.",
    "pt-BR": "Controle as notificações escolares das 7h, incluindo resumos diários, um resumo semanal tranquilo no domingo e um lembrete gentil após uma longa pausa.",
    id: "Kontrol notifikasi sekolah pukul 07.00, termasuk ringkasan harian, rekap mingguan yang tenang di hari Minggu, dan satu pengingat lembut setelah jeda panjang.",
  },
  morningDigest: { en: "School notifications", ar: "إشعارات المدرسة", es: "Notificaciones escolares", "pt-BR": "Notificações escolares", id: "Notifikasi sekolah" },
  morningDigestHint: {
    en: "Includes the daily digest, the Sunday weekly recap, and at most one quiet reminder after a long inactive gap.",
    ar: "تشمل الملخص اليومي وملخص الأحد الأسبوعي، وتذكيرًا هادئًا واحدًا كحد أقصى بعد فترة انقطاع طويلة.",
    es: "Incluye el resumen diario, el resumen semanal del domingo y como máximo un recordatorio tranquilo tras una larga pausa.",
    "pt-BR": "Inclui o resumo diário, o recap semanal de domingo e no máximo um lembrete tranquilo após um longo período inativo.",
    id: "Mencakup ringkasan harian, rekap mingguan hari Minggu, dan paling banyak satu pengingat tenang setelah jeda inaktif yang lama.",
  },
  timezone: { en: "Your timezone", ar: "منطقتك الزمنية", es: "Tu zona horaria", "pt-BR": "Seu fuso horário", id: "Zona waktu Anda" },
  timezoneHint: {
    en: "Used to send your daily digest and Sunday weekly recap at 7 AM local time.",
    ar: "تُستخدم لإرسال الملخص اليومي وملخص الأحد الأسبوعي عند الساعة 7 صباحًا بتوقيتك المحلي.",
    es: "Se usa para enviar tu resumen diario y el resumen semanal del domingo a las 7 a. m. hora local.",
    "pt-BR": "Usado para enviar seu resumo diário e recap semanal de domingo às 7h no horário local.",
    id: "Digunakan untuk mengirim ringkasan harian dan rekap mingguan hari Minggu Anda pada pukul 07.00 waktu setempat.",
  },
  browserTimezoneOption: {
    en: "(Your browser timezone)",
    ar: "(منطقة متصفحك الزمنية)",
    es: "(Tu zona horaria del navegador)",
    "pt-BR": "(Seu fuso horário do navegador)",
    id: "(Zona waktu browser Anda)",
  },
  saveTimezone: { en: "Save timezone", ar: "احفظ المنطقة الزمنية", es: "Guardar zona horaria", "pt-BR": "Salvar fuso horário", id: "Simpan zona waktu" },
  pushChecking: {
    en: "Checking browser notification status...",
    ar: "جارٍ التحقق من حالة إشعارات المتصفح...",
    es: "Verificando el estado de las notificaciones del navegador...",
    "pt-BR": "Verificando status das notificações do navegador...",
    id: "Memeriksa status notifikasi browser...",
  },
  pushEnabled: { en: "Digest notifications enabled.", ar: "تم تفعيل إشعارات الملخص.", es: "Notificaciones de resumen activadas.", "pt-BR": "Notificações de resumo ativadas.", id: "Notifikasi ringkasan diaktifkan." },
  pushDisabled: { en: "Digest notifications turned off.", ar: "تم إيقاف إشعارات الملخص.", es: "Notificaciones de resumen desactivadas.", "pt-BR": "Notificações de resumo desativadas.", id: "Notifikasi ringkasan dinonaktifkan." },
  pushError: {
    en: "Could not update digest notifications. Please try again.",
    ar: "تعذر تحديث إشعارات الملخص. حاول مرة أخرى.",
    es: "No se pudieron actualizar las notificaciones de resumen. Inténtalo de nuevo.",
    "pt-BR": "Não foi possível atualizar as notificações de resumo. Tente novamente.",
    id: "Tidak dapat memperbarui notifikasi ringkasan. Coba lagi.",
  },
  pushPermissionDenied: {
    en: "Browser notification permission was not granted.",
    ar: "لم يتم منح إذن إشعارات المتصفح.",
    es: "No se concedió el permiso de notificaciones del navegador.",
    "pt-BR": "Permissão de notificação do navegador não concedida.",
    id: "Izin notifikasi browser tidak diberikan.",
  },
  keep: { en: "Keep until I delete", ar: "الاحتفاظ حتى أحذفها", es: "Conservar hasta que yo lo elimine", "pt-BR": "Manter até eu excluir", id: "Simpan sampai saya hapus" },
  saveRetention: { en: "Save retention rule", ar: "احفظ قاعدة الاحتفاظ", es: "Guardar regla de retención", "pt-BR": "Salvar regra de retenção", id: "Simpan aturan retensi" },
  privacyTitle: { en: "Privacy controls", ar: "عناصر التحكم بالخصوصية", es: "Controles de privacidad", "pt-BR": "Controles de privacidade", id: "Kontrol privasi" },
  privacyBody: {
    en: "Choose whether Fazumi may use analytics, session replay, and marketing tracking.",
    ar: "اختر ما إذا كان يمكن لـ Fazumi استخدام التحليلات وتسجيل الجلسات وتتبع التسويق.",
    es: "Elige si Fazumi puede usar análisis, reproducción de sesión y seguimiento de marketing.",
    "pt-BR": "Escolha se o Fazumi pode usar análises, replay de sessão e rastreamento de marketing.",
    id: "Pilih apakah Fazumi boleh menggunakan analitik, pemutaran ulang sesi, dan pelacakan pemasaran.",
  },
  analytics: { en: "Analytics", ar: "التحليلات", es: "Análisis", "pt-BR": "Análises", id: "Analitik" },
  analyticsBody: { en: "Page views and product usage trends.", ar: "مشاهدات الصفحات واتجاهات استخدام المنتج.", es: "Vistas de página y tendencias de uso del producto.", "pt-BR": "Visualizações de página e tendências de uso do produto.", id: "Tampilan halaman dan tren penggunaan produk." },
  replay: { en: "Session replay", ar: "تسجيل الجلسات", es: "Reproducción de sesión", "pt-BR": "Replay de sessão", id: "Pemutaran ulang sesi" },
  replayBody: { en: "Interaction playback for debugging UX issues.", ar: "إعادة تشغيل التفاعل لتحليل مشكلات تجربة الاستخدام.", es: "Reproducción de interacciones para depurar problemas de UX.", "pt-BR": "Reprodução de interações para depurar problemas de UX.", id: "Pemutaran ulang interaksi untuk men-debug masalah UX." },
  marketing: { en: "Marketing", ar: "التسويق", es: "Marketing", "pt-BR": "Marketing", id: "Pemasaran" },
  marketingBody: { en: "Campaign measurement and future promotional messaging.", ar: "قياس الحملات والرسائل الترويجية المستقبلية.", es: "Medición de campañas y futuros mensajes promocionales.", "pt-BR": "Medição de campanhas e mensagens promocionais futuras.", id: "Pengukuran kampanye dan pesan promosi di masa mendatang." },
  necessary: { en: "Necessary storage", ar: "التخزين الضروري", es: "Almacenamiento necesario", "pt-BR": "Armazenamento necessário", id: "Penyimpanan yang diperlukan" },
  necessaryBody: { en: "Required for sign-in, preferences, and app security.", ar: "مطلوب لتسجيل الدخول والتفضيلات وأمان التطبيق.", es: "Necesario para iniciar sesión, preferencias y seguridad de la aplicación.", "pt-BR": "Necessário para login, preferências e segurança do aplicativo.", id: "Diperlukan untuk masuk, preferensi, dan keamanan aplikasi." },
  savePrivacy: { en: "Save privacy choices", ar: "حفظ خيارات الخصوصية", es: "Guardar preferencias de privacidad", "pt-BR": "Salvar preferências de privacidade", id: "Simpan pilihan privasi" },
  withdraw: { en: "Withdraw all optional consent", ar: "سحب جميع الموافقات الاختيارية", es: "Retirar todos los consentimientos opcionales", "pt-BR": "Retirar todos os consentimentos opcionais", id: "Cabut semua persetujuan opsional" },
  accountTitle: { en: "Account deletion", ar: "حذف الحساب", es: "Eliminación de cuenta", "pt-BR": "Exclusão de conta", id: "Penghapusan akun" },
  accountBody: {
    en: "One-click deletion now lives in Profile. Deleting the account removes saved summaries, todos, groups, PMF answers, and preferences tied to your Fazumi account. Raw chat text is not stored in the first place.",
    ar: "أصبح حذف الحساب بنقرة واحدة موجودًا الآن في الملف الشخصي. حذف الحساب يزيل الملخصات والمهام والمجموعات وإجابات PMF والتفضيلات المرتبطة بحسابك في Fazumi. أما نص المحادثة الخام فلا يتم حفظه من الأساس.",
    es: "La eliminación con un clic ahora está en el Perfil. Eliminar la cuenta borra los resúmenes guardados, tareas, grupos, respuestas PMF y preferencias vinculadas a tu cuenta de Fazumi. El texto del chat sin procesar no se almacena.",
    "pt-BR": "A exclusão com um clique agora fica no Perfil. Excluir a conta remove resumos salvos, tarefas, grupos, respostas PMF e preferências vinculadas à sua conta Fazumi. O texto bruto do chat não é armazenado.",
    id: "Penghapusan satu klik kini ada di Profil. Menghapus akun akan menghilangkan ringkasan tersimpan, tugas, grup, jawaban PMF, dan preferensi yang terkait dengan akun Fazumi Anda. Teks obrolan mentah tidak disimpan sejak awal.",
  },
  openProfile: { en: "Open profile and delete account", ar: "افتح الملف الشخصي واحذف الحساب", es: "Abrir perfil y eliminar cuenta", "pt-BR": "Abrir perfil e excluir conta", id: "Buka profil dan hapus akun" },
  supportTitle: { en: "Support", ar: "الدعم", es: "Soporte", "pt-BR": "Suporte", id: "Dukungan" },
  supportBody: {
    en: "Help, FAQs, and contact live here so the main navigation stays focused.",
    ar: "أصبحت المساعدة والأسئلة الشائعة ووسائل التواصل هنا حتى تبقى القائمة الرئيسية مركزة.",
    es: "La ayuda, las preguntas frecuentes y el contacto están aquí para que la navegación principal permanezca enfocada.",
    "pt-BR": "Ajuda, FAQs e contato ficam aqui para que a navegação principal permaneça focada.",
    id: "Bantuan, FAQ, dan kontak ada di sini agar navigasi utama tetap terfokus.",
  },
  help: { en: "Open Help", ar: "افتح المساعدة", es: "Abrir ayuda", "pt-BR": "Abrir ajuda", id: "Buka bantuan" },
  contact: { en: "Contact support", ar: "تواصل مع الدعم", es: "Contactar soporte", "pt-BR": "Contatar suporte", id: "Hubungi dukungan" },
  saving: { en: "Saving...", ar: "جارٍ الحفظ...", es: "Guardando...", "pt-BR": "Salvando...", id: "Menyimpan..." },
  saved: { en: "Saved.", ar: "تم الحفظ.", es: "Guardado.", "pt-BR": "Salvo.", id: "Tersimpan." },
  saveError: { en: "Could not save. Please try again.", ar: "تعذر الحفظ. حاول مرة أخرى.", es: "No se pudo guardar. Inténtalo de nuevo.", "pt-BR": "Não foi possível salvar. Tente novamente.", id: "Tidak dapat menyimpan. Coba lagi." },
  loading: { en: "Loading saved settings...", ar: "جارٍ تحميل الإعدادات المحفوظة...", es: "Cargando configuración guardada...", "pt-BR": "Carregando configurações salvas...", id: "Memuat pengaturan tersimpan..." },
  notSet: { en: "Not set", ar: "غير محدد", es: "No establecido", "pt-BR": "Não definido", id: "Belum diatur" },
  lastSaved: { en: "Last saved", ar: "آخر حفظ", es: "Último guardado", "pt-BR": "Último salvo", id: "Terakhir disimpan" },
  noConsent: { en: "No stored consent yet. Optional tracking is off by default.", ar: "لا توجد موافقة محفوظة بعد. التتبع الاختياري متوقف افتراضيًا.", es: "Sin consentimiento almacenado aún. El seguimiento opcional está desactivado por defecto.", "pt-BR": "Sem consentimento armazenado ainda. O rastreamento opcional está desativado por padrão.", id: "Belum ada persetujuan tersimpan. Pelacakan opsional dinonaktifkan secara default." },
  euNotice: { en: "EU privacy banner is active for your region.", ar: "يظهر شريط الخصوصية الأوروبي في منطقتك.", es: "El banner de privacidad de la UE está activo para tu región.", "pt-BR": "O banner de privacidade da UE está ativo para sua região.", id: "Banner privasi EU aktif untuk wilayah Anda." },
  otherNotice: { en: "You can change analytics choices here at any time.", ar: "يمكنك تغيير خيارات التحليلات هنا في أي وقت.", es: "Puedes cambiar tus preferencias de análisis aquí en cualquier momento.", "pt-BR": "Você pode alterar suas preferências de análise aqui a qualquer momento.", id: "Anda dapat mengubah pilihan analitik Anda di sini kapan saja." },
  retentionUpdated: { en: "Retention updated.", ar: "تم تحديث مدة الاحتفاظ.", es: "Retención actualizada.", "pt-BR": "Retenção atualizada.", id: "Retensi diperbarui." },
  retentionDeleted: { en: "Older summaries deleted", ar: "تم حذف الملخصات الأقدم", es: "Resúmenes más antiguos eliminados", "pt-BR": "Resumos mais antigos excluídos", id: "Ringkasan lama dihapus" },
  profileTitle: { en: "Profile", ar: "الملف الشخصي", es: "Perfil", "pt-BR": "Perfil", id: "Profil" },
  profileBody: { en: "Update your display name and profile photo.", ar: "حدّث اسمك المعروض وصورة ملفك الشخصي.", es: "Actualiza tu nombre de pantalla y foto de perfil.", "pt-BR": "Atualize seu nome de exibição e foto de perfil.", id: "Perbarui nama tampilan dan foto profil Anda." },
  profilePhoto: { en: "Profile photo", ar: "صورة الملف الشخصي", es: "Foto de perfil", "pt-BR": "Foto de perfil", id: "Foto profil" },
  profilePhotoHint: {
    en: "Click the current photo to upload a JPG, PNG, WEBP, or GIF up to 2 MB.",
    ar: "انقر على الصورة الحالية لرفع JPG أو PNG أو WEBP أو GIF بحجم يصل إلى 2 ميجابايت.",
    es: "Haz clic en la foto actual para subir un JPG, PNG, WEBP o GIF de hasta 2 MB.",
    "pt-BR": "Clique na foto atual para fazer upload de um JPG, PNG, WEBP ou GIF de até 2 MB.",
    id: "Klik foto saat ini untuk mengunggah JPG, PNG, WEBP, atau GIF hingga 2 MB.",
  },
  displayName: { en: "Display name", ar: "الاسم المعروض", es: "Nombre de pantalla", "pt-BR": "Nome de exibição", id: "Nama tampilan" },
  avatarUploading: { en: "Uploading photo...", ar: "جارٍ رفع الصورة...", es: "Subiendo foto...", "pt-BR": "Enviando foto...", id: "Mengunggah foto..." },
  avatarUploadError: {
    en: "Could not upload the photo. Please try again.",
    ar: "تعذر رفع الصورة. حاول مرة أخرى.",
    es: "No se pudo subir la foto. Inténtalo de nuevo.",
    "pt-BR": "Não foi possível fazer upload da foto. Tente novamente.",
    id: "Tidak dapat mengunggah foto. Coba lagi.",
  },
  avatarUploadInvalidType: {
    en: "Use a JPG, PNG, WEBP, or GIF image.",
    ar: "استخدم صورة من نوع JPG أو PNG أو WEBP أو GIF.",
    es: "Usa una imagen JPG, PNG, WEBP o GIF.",
    "pt-BR": "Use uma imagem JPG, PNG, WEBP ou GIF.",
    id: "Gunakan gambar JPG, PNG, WEBP, atau GIF.",
  },
  avatarUploadTooLarge: {
    en: "Use an image smaller than 2 MB.",
    ar: "استخدم صورة أصغر من 2 ميجابايت.",
    es: "Usa una imagen de menos de 2 MB.",
    "pt-BR": "Use uma imagem menor que 2 MB.",
    id: "Gunakan gambar yang lebih kecil dari 2 MB.",
  },
  avatarRemoveError: {
    en: "Could not remove the photo. Please try again.",
    ar: "تعذر إزالة الصورة. حاول مرة أخرى.",
    es: "No se pudo eliminar la foto. Inténtalo de nuevo.",
    "pt-BR": "Não foi possível remover a foto. Tente novamente.",
    id: "Tidak dapat menghapus foto. Coba lagi.",
  },
  removePhoto: { en: "Remove photo", ar: "إزالة الصورة", es: "Eliminar foto", "pt-BR": "Remover foto", id: "Hapus foto" },
  saveProfile: { en: "Save profile", ar: "حفظ الملف الشخصي", es: "Guardar perfil", "pt-BR": "Salvar perfil", id: "Simpan profil" },
} as const;

function pick(locale: Locale, value: { en: string; ar: string }) {
  if (locale === "ar") return value.ar;
  const extended = value as Record<string, string>;
  return extended[locale] ?? value.en;
}

const LANG_LABELS: Record<Locale, string> = {
  en:      "English",
  ar:      "العربية",
  es:      "Español",
  "pt-BR": "Português",
  id:      "Bahasa Indonesia",
};

function splitDraft(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLineDraft(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getBrowserTimeZone() {
  if (typeof window === "undefined") {
    return "";
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
}

function buildTimezoneOptions(locale: Locale, browserTimeZone: string, selectedTimeZone: string) {
  const seen = new Set(TIMEZONE_OPTIONS.map((option) => option.value));
  const options = [...TIMEZONE_OPTIONS];
  const extraOptions: Array<{ value: string; label: string }> = [];

  if (browserTimeZone && !seen.has(browserTimeZone)) {
    extraOptions.push({
      value: browserTimeZone,
      label: `${browserTimeZone} ${pick(locale, COPY.browserTimezoneOption)}`,
    });
    seen.add(browserTimeZone);
  }

  if (selectedTimeZone && !seen.has(selectedTimeZone)) {
    extraOptions.push({
      value: selectedTimeZone,
      label: selectedTimeZone,
    });
  }

  return [...extraOptions, ...options];
}

function isPushSupportedInBrowser() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function toPushSubscriptionPayload(subscription: PushSubscription): WebPushSubscriptionPayload {
  const serialized = subscription.toJSON();

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      auth: serialized.keys?.auth ?? "",
      p256dh: serialized.keys?.p256dh ?? "",
    },
  };
}

async function getPushRegistration() {
  const existingRegistration = await navigator.serviceWorker.getRegistration();

  if (!existingRegistration) {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }

  return navigator.serviceWorker.ready;
}

function retentionLabel(locale: Locale, value: number | null) {
  if (value === null) {
    return pick(locale, COPY.keep);
  }

  return locale === "ar" ? `${value} يومًا` : `${value} days`;
}

async function saveProfilePatch(patch: ProfilePatch) {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = (await response.json().catch(() => null)) as { error?: string; deletedCount?: number } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Could not save profile settings.");
  }

  return data;
}

async function uploadAvatarFile(file: File) {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/profile/avatar", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json().catch(() => null)) as { avatarUrl?: string; error?: string } | null;

  if (!response.ok || typeof data?.avatarUrl !== "string") {
    throw new Error(data?.error ?? "Could not upload avatar.");
  }

  return data.avatarUrl;
}

async function removeAvatarFile() {
  const response = await fetch("/api/profile/avatar", {
    method: "DELETE",
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Could not remove avatar.");
  }
}

async function syncPushSubscriptionTimeZone(
  subscription: PushSubscription,
  timeZone: string | null
) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription: toPushSubscriptionPayload(subscription),
      timezone: timeZone,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not save push subscription.");
  }
}

function ConsentToggle({
  checked,
  description,
  disabled = false,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--primary)]"
      />
    </label>
  );
}

export function SettingsPanel() {
  const { locale, siteLocale, setLocale } = useLang();
  const { theme, toggleTheme } = useTheme();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const {
    consent,
    consentTimestamp,
    hasConsentDecision,
    isEuUser,
    isSaving,
    savePreferences,
    withdrawConsent,
  } = useConsentManager();
  const [savedKey, setSavedKey] = useState<"theme" | "lang" | null>(null);
  const [consentDraft, setConsentDraft] = useState<ConsentPreferences>(consent);
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savedAvatarUrl, setSavedAvatarUrl] = useState("");
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [profileErrorKey, setProfileErrorKey] = useState<
    "saveError" | "avatarRemoveError" | "avatarUploadError" | "avatarUploadInvalidType" | "avatarUploadTooLarge"
  >("saveError");
  const [profileLoading, setProfileLoading] = useState(true);
  const [billingPlan, setBillingPlan] = useState("free");
  const [founderSince, setFounderSince] = useState<FounderSinceCopy>({ en: "", ar: "" });
  const [familyContext, setFamilyContext] = useState<FamilyContext>(getEmptyFamilyContext());
  const [savedFamilyContext, setSavedFamilyContext] = useState<FamilyContext>(getEmptyFamilyContext());
  const [teachersDraft, setTeachersDraft] = useState("");
  const [savedTeachersDraft, setSavedTeachersDraft] = useState("");
  const [groupNamesDraft, setGroupNamesDraft] = useState("");
  const [savedGroupNamesDraft, setSavedGroupNamesDraft] = useState("");
  const [linksDraft, setLinksDraft] = useState("");
  const [savedLinksDraft, setSavedLinksDraft] = useState("");
  const [memoryStatus, setMemoryStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showMemorySavedConfirmation, setShowMemorySavedConfirmation] = useState(false);
  const [renderMemorySavedConfirmation, setRenderMemorySavedConfirmation] = useState(false);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [savedRetentionDays, setSavedRetentionDays] = useState<number | null>(null);
  const [retentionStatus, setRetentionStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [retentionDeletedCount, setRetentionDeletedCount] = useState<number | null>(null);
  const [pushVisible, setPushVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [pushFeedback, setPushFeedback] = useState<PushFeedbackState | null>(null);
  const [browserTimeZone, setBrowserTimeZone] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [savedTimeZone, setSavedTimeZone] = useState("");
  const [timeZoneStatus, setTimeZoneStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const isRtl = locale === "ar";

  useEffect(() => {
    setConsentDraft(consent);
  }, [consent]);

  useEffect(() => {
    setBrowserTimeZone(getBrowserTimeZone());
  }, []);

  useEffect(() => {
    if (browserTimeZone && !timeZone && !savedTimeZone) {
      setTimeZone(browserTimeZone);
    }
  }, [browserTimeZone, savedTimeZone, timeZone]);

  useEffect(() => {
    let active = true;

    async function loadPushState() {
      if (!isPushSupportedInBrowser()) {
        if (active) {
          setPushVisible(false);
          setPushBusy(false);
          setPushEnabled(false);
          setPushPermission(
            typeof window !== "undefined" && "Notification" in window
              ? Notification.permission
              : null
          );
        }
        return;
      }

      if (active) {
        setPushVisible(true);
        setPushBusy(true);
        setPushPermission(Notification.permission);
      }

      try {
        const registration = await getPushRegistration();
        const subscription = await registration.pushManager.getSubscription();

        if (!active) {
          return;
        }

        setPushEnabled(Boolean(subscription));
        setPushPermission(Notification.permission);
      } catch {
        if (!active) {
          return;
        }

        setPushEnabled(false);
        setPushFeedback("error");
      } finally {
        if (active) {
          setPushBusy(false);
        }
      }
    }

    void loadPushState();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!pushFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setPushFeedback(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [pushFeedback]);

  useEffect(() => {
    if (!showMemorySavedConfirmation) {
      return;
    }

    const timeoutId = window.setTimeout(() => setShowMemorySavedConfirmation(false), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [showMemorySavedConfirmation]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || !user) {
          return;
        }

        const [{ data: profile }, { data: subscriptions }] = await Promise.all([
          supabase
            .from("profiles")
            .select("family_context, summary_retention_days, timezone, full_name, avatar_url, plan, trial_expires_at")
            .eq("id", user.id)
            .maybeSingle<{
              family_context: unknown;
              summary_retention_days: number | null;
              timezone: string | null;
              full_name: string | null;
              avatar_url: string | null;
              plan: string | null;
              trial_expires_at: string | null;
            }>(),
          supabase
            .from("subscriptions")
            .select("plan_type, status, current_period_end, updated_at, created_at, ls_subscription_id, ls_order_id")
            .eq("user_id", user.id)
        ]);

        if (!active) {
          return;
        }

        const nextContext = normalizeFamilyContext(profile?.family_context);
        const nextTeachers = nextContext.teacher_names.join("\n");
        const nextGroupNames = nextContext.group_names.join("\n");
        const nextLinks = nextContext.recurring_links.join("\n");
        const nextRetention = normalizeSummaryRetentionDays(profile?.summary_retention_days);
        const detectedTimeZone = getBrowserTimeZone();
        const nextSavedTimeZone = profile?.timezone?.trim() ?? "";
        const nextTimeZone = nextSavedTimeZone || detectedTimeZone;
        const subscriptionRows = (subscriptions ?? []) as EntitlementSubscription[];
        const entitlement = resolveEntitlement({
          profile: {
            plan: profile?.plan ?? "free",
            trial_expires_at: profile?.trial_expires_at ?? null,
          },
          subscriptions: subscriptionRows,
        });
        const founderSubscription =
          [...subscriptionRows]
            .filter(
              (subscription) =>
                subscription.plan_type === "founder" && typeof subscription.created_at === "string"
            )
            .sort(
              (left, right) =>
                new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime()
            )[0] ?? null;

        setFamilyContext(nextContext);
        setSavedFamilyContext(nextContext);
        setTeachersDraft(nextTeachers);
        setSavedTeachersDraft(nextTeachers);
        setGroupNamesDraft(nextGroupNames);
        setSavedGroupNamesDraft(nextGroupNames);
        setLinksDraft(nextLinks);
        setSavedLinksDraft(nextLinks);
        setRetentionDays(nextRetention);
        setSavedRetentionDays(nextRetention);
        setBrowserTimeZone(detectedTimeZone);
        setTimeZone(nextTimeZone);
        setSavedTimeZone(nextSavedTimeZone);
        setBillingPlan(entitlement.billingPlan);
        setFounderSince(
          founderSubscription?.created_at
            ? {
                en: formatDate(founderSubscription.created_at, "en", { year: "numeric", month: "long" }),
                ar: formatDate(founderSubscription.created_at, "ar", { year: "numeric", month: "long" }),
              }
            : { en: "", ar: "" }
        );
        const name = profile?.full_name ?? "";
        const avatar = profile?.avatar_url ?? "";
        setDisplayName(name);
        setSavedDisplayName(name);
        setAvatarUrl(avatar);
        setSavedAvatarUrl(avatar);
      } catch {
        // Keep the settings page usable even if profile sync is unavailable.
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function flash(key: "theme" | "lang") {
    setSavedKey(key);
    window.setTimeout(() => setSavedKey(null), 1800);
  }

  async function handleTheme(next: "light" | "dark") {
    if (theme === next) {
      return;
    }

    toggleTheme();
    try {
      await saveProfilePatch({ theme_pref: next });
    } catch {
      // Keep the local theme change even if profile sync fails.
    }
    flash("theme");
  }

  async function handleLang(next: Locale) {
    if (siteLocale === next) {
      return;
    }

    setLocale(next);
    try {
      await saveProfilePatch({ lang_pref: next });
    } catch {
      // Keep the local language change even if profile sync fails.
    }
    flash("lang");
  }

  async function handleSaveMemory() {
    const nextContext = normalizeFamilyContext({
      ...familyContext,
      teacher_names: splitDraft(teachersDraft),
      group_names: splitLineDraft(groupNamesDraft),
      recurring_links: splitDraft(linksDraft),
    });

    setMemoryStatus("saving");
    setShowMemorySavedConfirmation(false);
    setRenderMemorySavedConfirmation(false);
    try {
      await saveProfilePatch({ family_context: nextContext });
      const nextTeachers = nextContext.teacher_names.join("\n");
      const nextGroupNames = nextContext.group_names.join("\n");
      const nextLinks = nextContext.recurring_links.join("\n");
      setFamilyContext(nextContext);
      setSavedFamilyContext(nextContext);
      setTeachersDraft(nextTeachers);
      setSavedTeachersDraft(nextTeachers);
      setGroupNamesDraft(nextGroupNames);
      setSavedGroupNamesDraft(nextGroupNames);
      setLinksDraft(nextLinks);
      setSavedLinksDraft(nextLinks);
      setMemoryStatus("saved");
      setRenderMemorySavedConfirmation(true);
      setShowMemorySavedConfirmation(true);
      trackEvent(AnalyticsEvents.FAMILY_CONTEXT_SAVED, {
        groupType: nextContext.group_type,
        preferredCurrency: nextContext.preferred_currency,
        teacherCount: nextContext.teacher_names.length,
        recurringLinkCount: nextContext.recurring_links.length,
      });
    } catch {
      setMemoryStatus("error");
    }
  }

  async function handleSaveRetention() {
    const nextRetention = normalizeSummaryRetentionDays(retentionDays);

    setRetentionStatus("saving");
    setRetentionDeletedCount(null);
    try {
      const result = await saveProfilePatch({ summary_retention_days: nextRetention });
      setSavedRetentionDays(nextRetention);
      setRetentionDeletedCount(result?.deletedCount ?? 0);
      setRetentionStatus("saved");
      trackEvent(AnalyticsEvents.RETENTION_UPDATED, {
        summaryRetentionDays: nextRetention,
        deletedCount: result?.deletedCount ?? 0,
      });
    } catch {
      setRetentionStatus("error");
    }
  }

  function formatConsentTimestamp(value: string) {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  const selectClassName =
    "flex h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface-elevated)] px-4 py-3 text-[var(--text-base)] text-[var(--card-foreground)] shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";
  const normalizedDisplayName = displayName.trim().slice(0, 100);
  const consentChanged = JSON.stringify(consentDraft) !== JSON.stringify(consent);
  const memoryChanged =
    JSON.stringify(familyContext) !== JSON.stringify(savedFamilyContext) ||
    teachersDraft !== savedTeachersDraft ||
    groupNamesDraft !== savedGroupNamesDraft ||
    linksDraft !== savedLinksDraft;
  const retentionChanged = retentionDays !== savedRetentionDays;
  const profileChanged = normalizedDisplayName !== savedDisplayName;
  const currentAvatarUrl = avatarUrl || savedAvatarUrl;
  const hasAvatar = currentAvatarUrl.length > 0;
  const timeZoneChanged = timeZone.length > 0 && timeZone !== savedTimeZone;
  const timeZoneOptions = buildTimezoneOptions(locale, browserTimeZone, timeZone);
  const pushFeedbackMessage =
    pushFeedback === "enabled"
      ? pick(siteLocale,COPY.pushEnabled)
      : pushFeedback === "disabled"
        ? pick(siteLocale,COPY.pushDisabled)
        : pushFeedback === "permissionDenied"
          ? pick(siteLocale,COPY.pushPermissionDenied)
          : pushFeedback === "error"
            ? pick(siteLocale,COPY.pushError)
            : null;

  async function handleSaveProfile() {
    setProfileStatus("saving");
    setProfileErrorKey("saveError");
    try {
      await saveProfilePatch({ full_name: normalizedDisplayName });
      setDisplayName(normalizedDisplayName);
      setSavedDisplayName(normalizedDisplayName);
      dispatchProfileUpdated({
        fullName: normalizedDisplayName || null,
        avatarUrl: savedAvatarUrl || null,
      });
      setProfileStatus("saved");
    } catch {
      setProfileStatus("error");
    }
  }

  async function handleAvatarSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!SUPPORTED_AVATAR_TYPES.has(file.type)) {
      setProfileErrorKey("avatarUploadInvalidType");
      setProfileStatus("error");
      return;
    }

    if (file.size > MAX_AVATAR_FILE_BYTES) {
      setProfileErrorKey("avatarUploadTooLarge");
      setProfileStatus("error");
      return;
    }

    setProfileStatus("saving");
    setProfileErrorKey("avatarUploadError");

    try {
      const nextAvatarUrl = await uploadAvatarFile(file);
      setAvatarUrl(nextAvatarUrl);
      setSavedAvatarUrl(nextAvatarUrl);
      dispatchProfileUpdated({
        fullName: savedDisplayName || null,
        avatarUrl: nextAvatarUrl,
      });
      setProfileStatus("saved");
    } catch {
      setProfileStatus("error");
    }
  }

  async function handleRemoveAvatar() {
    if (!hasAvatar) {
      return;
    }

    setProfileStatus("saving");
    setProfileErrorKey("avatarRemoveError");

    try {
      await removeAvatarFile();
      setAvatarUrl("");
      setSavedAvatarUrl("");
      dispatchProfileUpdated({
        fullName: savedDisplayName || null,
        avatarUrl: null,
      });
      setProfileStatus("saved");
    } catch {
      setProfileStatus("error");
    }
  }

  async function handleSaveTimeZone() {
    if (!timeZone) {
      return;
    }

    setTimeZoneStatus("saving");
    try {
      await saveProfilePatch({ timezone: timeZone });

      const existingRegistration = await navigator.serviceWorker.getRegistration();
      const subscription = await existingRegistration?.pushManager.getSubscription();
      if (subscription) {
        await syncPushSubscriptionTimeZone(subscription, timeZone);
      }

      setSavedTimeZone(timeZone);
      setTimeZoneStatus("saved");
    } catch {
      setTimeZoneStatus("error");
    }
  }

  async function handlePushToggle(nextChecked: boolean) {
    if (!pushVisible || pushBusy) {
      return;
    }

    setPushBusy(true);
    setPushFeedback(null);

    try {
      const registration = await getPushRegistration();

      if (nextChecked) {
        const permission =
          pushPermission === "granted"
            ? "granted"
            : await Notification.requestPermission();

        setPushPermission(permission);

        if (permission !== "granted") {
          setPushEnabled(false);
          setPushFeedback("permissionDenied");
          return;
        }

        const existingSubscription = await registration.pushManager.getSubscription();
        const createdNewSubscription = !existingSubscription;
        const subscription =
          existingSubscription ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          }));

        if (!timeZone && browserTimeZone) {
          setTimeZone(browserTimeZone);
        }

        try {
          await syncPushSubscriptionTimeZone(
            subscription,
            timeZone || browserTimeZone || getBrowserTimeZone() || null
          );
        } catch {
          if (createdNewSubscription) {
            await subscription.unsubscribe().catch(() => undefined);
          }
          throw new Error("Could not save push subscription.");
        }

        setPushEnabled(true);
        setPushFeedback("enabled");
        return;
      }

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        const response = await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint }),
        });

        if (!response.ok) {
          throw new Error("Could not remove push subscription.");
        }
      }

      setPushEnabled(false);
      setPushFeedback("disabled");
    } catch {
      setPushFeedback("error");

      try {
        const registration = await getPushRegistration();
        const subscription = await registration.pushManager.getSubscription();
        setPushEnabled(Boolean(subscription));
      } catch {
        setPushEnabled(false);
      }
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} lang={locale} className={cn("space-y-4", isRtl && "font-arabic")}>
      <div className="space-y-2">
        <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
          {pick(siteLocale,COPY.title)}
        </h1>
        <p className="max-w-3xl text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
          {pick(siteLocale,COPY.description)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <UserCircle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(siteLocale,COPY.profileTitle)}</CardTitle>
              <CardDescription>{pick(siteLocale,COPY.profileBody)}</CardDescription>
              {billingPlan === "founder" && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <Star className="h-3.5 w-3.5 shrink-0" />
                  <LocalizedText
                    en={`Founding Supporter${founderSince.en ? ` since ${founderSince.en}` : ""}`}
                    ar={`داعم مؤسس${founderSince.ar ? ` منذ ${founderSince.ar}` : ""}`}
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={profileStatus === "saving"}
              aria-label={pick(siteLocale,COPY.profilePhoto)}
              className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Avatar
                name={normalizedDisplayName || savedDisplayName || "?"}
                src={currentAvatarUrl}
                size="lg"
                className="h-16 w-16 text-base shadow-[var(--shadow-sm)]"
              />
              <span
                className={cn(
                  "absolute bottom-0 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[var(--shadow-sm)]",
                  isRtl ? "left-0" : "right-0"
                )}
              >
                {profileStatus === "saving" ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept={AVATAR_ACCEPT}
              className="sr-only"
              onChange={(event) => void handleAvatarSelection(event)}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.profilePhoto)}</p>
              <p className="text-xs leading-5 text-[var(--muted-foreground)]">{pick(siteLocale,COPY.profilePhotoHint)}</p>
              {hasAvatar && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRemoveAvatar()}
                  disabled={profileStatus === "saving"}
                  className="mt-2"
                >
                  {pick(siteLocale,COPY.removePhoto)}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.displayName)}</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={pick(siteLocale,COPY.notSet)}
              maxLength={100}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void handleSaveProfile()} disabled={!profileChanged || profileStatus === "saving"}>
              {profileStatus === "saving" ? pick(siteLocale,COPY.saving) : pick(siteLocale,COPY.saveProfile)}
            </Button>
            {profileStatus === "saved" && <span className="text-sm text-[var(--success)]">{pick(siteLocale,COPY.saved)}</span>}
            {profileStatus === "error" && (
              <span className="text-sm text-[var(--destructive)]">{pick(siteLocale,COPY[profileErrorKey])}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{pick(siteLocale,COPY.themeTitle)}</CardTitle>
          <CardDescription>{pick(siteLocale,COPY.themeBody)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleTheme("light")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                theme === "light"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Sun className="h-4 w-4" />
              {pick(siteLocale,COPY.light)}
            </button>
            <button
              type="button"
              onClick={() => void handleTheme("dark")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                theme === "dark"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Moon className="h-4 w-4" />
              {pick(siteLocale,COPY.dark)}
            </button>
          </div>
          {savedKey === "theme" && (
            <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
              <Check className="h-3.5 w-3.5" />
              {pick(siteLocale,COPY.saved)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{pick(siteLocale,COPY.languageTitle)}</CardTitle>
          <CardDescription>{pick(siteLocale,COPY.languageBody)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(["en", "ar", "es", "pt-BR", "id"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => void handleLang(value)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-colors",
                  siteLocale === value
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
                )}
              >
                <Globe className="h-4 w-4" />
                {LANG_LABELS[value]}
              </button>
            ))}
          </div>
          {savedKey === "lang" && (
            <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
              <Check className="h-3.5 w-3.5" />
              {pick(siteLocale,COPY.saved)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(siteLocale,COPY.memoryTitle)}</CardTitle>
              <CardDescription>{pick(siteLocale,COPY.memoryBody)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileLoading ? (
            <p className="text-sm text-[var(--muted-foreground)]">{pick(siteLocale,COPY.loading)}</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.school)}</label>
                  <Input
                    value={familyContext.school_name ?? ""}
                    onChange={(event) => setFamilyContext((current) => ({ ...current, school_name: event.target.value }))}
                    placeholder={pick(siteLocale,COPY.notSet)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.child)}</label>
                  <Input
                    value={familyContext.child_name ?? ""}
                    onChange={(event) => setFamilyContext((current) => ({ ...current, child_name: event.target.value }))}
                    placeholder={pick(siteLocale,COPY.notSet)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.className)}</label>
                  <Input
                    value={familyContext.class_name ?? ""}
                    onChange={(event) => setFamilyContext((current) => ({ ...current, class_name: event.target.value }))}
                    placeholder={pick(siteLocale,COPY.notSet)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.groupType)}</label>
                  <select
                    value={familyContext.group_type ?? ""}
                    onChange={(event) =>
                      setFamilyContext((current) => ({
                        ...current,
                        group_type: (event.target.value || null) as FamilyGroupType | null,
                      }))
                    }
                    className={selectClassName}
                  >
                    <option value="">{pick(siteLocale,COPY.notSet)}</option>
                    {GROUP_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {pick(siteLocale, option)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.teachers)}</label>
                  <Textarea value={teachersDraft} onChange={(event) => setTeachersDraft(event.target.value)} rows={4} />
                  <p className="text-xs text-[var(--muted-foreground)]">{pick(siteLocale,COPY.teachersHint)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.groupNames)}</label>
                  <Textarea
                    value={groupNamesDraft}
                    onChange={(event) => setGroupNamesDraft(event.target.value)}
                    rows={4}
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                  <p className="text-xs text-[var(--muted-foreground)]">{pick(siteLocale,COPY.groupNamesHint)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.links)}</label>
                  <Textarea value={linksDraft} onChange={(event) => setLinksDraft(event.target.value)} rows={4} />
                  <p className="text-xs text-[var(--muted-foreground)]">{pick(siteLocale,COPY.linksHint)}</p>
                </div>
              </div>

              <div className="space-y-2 md:max-w-sm">
                <label className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.currency)}</label>
                <select
                  value={familyContext.preferred_currency ?? ""}
                  onChange={(event) =>
                    setFamilyContext((current) => ({
                      ...current,
                      preferred_currency: (event.target.value || null) as SupportedCurrency | null,
                    }))
                  }
                  className={selectClassName}
                >
                  <option value="">{pick(siteLocale,COPY.notSet)}</option>
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void handleSaveMemory()} disabled={!memoryChanged || memoryStatus === "saving"}>
                  {memoryStatus === "saving" ? pick(siteLocale,COPY.saving) : pick(siteLocale,COPY.saveMemory)}
                </Button>
                {renderMemorySavedConfirmation && (
                  <p
                    aria-live="polite"
                    onTransitionEnd={() => {
                      if (!showMemorySavedConfirmation) {
                        setRenderMemorySavedConfirmation(false);
                      }
                    }}
                    className={cn(
                      "text-xs text-[var(--muted-foreground)] transition-opacity duration-300",
                      showMemorySavedConfirmation ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {pick(siteLocale,COPY.memorySavedConfirmation)}
                  </p>
                )}
                {memoryStatus === "error" && <span className="text-sm text-[var(--destructive)]">{pick(siteLocale,COPY.saveError)}</span>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(siteLocale,COPY.trustTitle)}</CardTitle>
              <CardDescription>{pick(siteLocale,COPY.trustBody)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.stored)}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{pick(siteLocale,COPY.storedBody)}</p>
            <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.notStored)}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{pick(siteLocale,COPY.notStoredBody)}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.retention)}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{pick(siteLocale,COPY.retentionHint)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[null, 30, 90, 365].map((value) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => setRetentionDays(value)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  retentionDays === value
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                )}
              >
                {retentionLabel(locale, value)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void handleSaveRetention()} disabled={!retentionChanged || retentionStatus === "saving"}>
              {retentionStatus === "saving" ? pick(siteLocale,COPY.saving) : pick(siteLocale,COPY.saveRetention)}
            </Button>
            {retentionStatus === "saved" && (
              <span className="text-sm text-[var(--success)]">
                {pick(siteLocale,COPY.retentionUpdated)}
                {typeof retentionDeletedCount === "number" ? ` ${pick(siteLocale,COPY.retentionDeleted)}: ${retentionDeletedCount}.` : ""}
              </span>
            )}
            {retentionStatus === "error" && <span className="text-sm text-[var(--destructive)]">{pick(siteLocale,COPY.saveError)}</span>}
          </div>
        </CardContent>
      </Card>

      {pushVisible && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{pick(siteLocale,COPY.notificationsTitle)}</CardTitle>
                <CardDescription>{pick(siteLocale,COPY.notificationsBody)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
              <div className="space-y-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{pick(siteLocale,COPY.morningDigest)}</p>
                  <p
                    id="settings-morning-digest-hint"
                    className="text-xs leading-5 text-[var(--muted-foreground)]"
                  >
                    {pick(siteLocale,COPY.morningDigestHint)}
                  </p>
                </div>
                {(pushBusy || pushFeedbackMessage) && (
                  <p
                    aria-live="polite"
                    className={cn(
                      "text-xs",
                      pushFeedback === "error" || pushFeedback === "permissionDenied"
                        ? "text-[var(--destructive)]"
                        : pushFeedbackMessage
                          ? "text-[var(--success)]"
                          : "text-[var(--muted-foreground)]"
                    )}
                  >
                    {pushBusy && !pushFeedbackMessage
                      ? pick(siteLocale,COPY.pushChecking)
                      : pushFeedbackMessage}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {pushBusy && <LoaderCircle className="h-4 w-4 animate-spin text-[var(--primary)]" />}
                <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    disabled={pushBusy}
                    aria-describedby="settings-morning-digest-hint"
                    onChange={(event) => void handlePushToggle(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="h-6 w-11 rounded-full bg-[var(--border)] transition-colors duration-200 peer-checked:bg-[var(--primary)] peer-disabled:cursor-not-allowed peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--background)]" />
                  <span
                    className={cn(
                      "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[var(--shadow-xs)] transition-transform duration-200",
                      isRtl
                        ? "right-0.5 peer-checked:-translate-x-5"
                        : "left-0.5 peer-checked:translate-x-5"
                    )}
                  />
                </span>
              </div>
            </label>

            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="settings-timezone"
                  className="text-sm font-semibold text-[var(--foreground)]"
                >
                  {pick(siteLocale,COPY.timezone)}
                </label>
                <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                  {pick(siteLocale,COPY.timezoneHint)}
                </p>
              </div>
              <select
                id="settings-timezone"
                value={timeZone}
                onChange={(event) => {
                  setTimeZone(event.target.value);
                  setTimeZoneStatus("idle");
                }}
                dir={isRtl ? "rtl" : "ltr"}
                className={selectClassName}
              >
                {!timeZone && <option value="">{pick(siteLocale,COPY.notSet)}</option>}
                {timeZoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void handleSaveTimeZone()}
                  disabled={!timeZoneChanged || timeZoneStatus === "saving"}
                >
                  {timeZoneStatus === "saving"
                    ? pick(siteLocale,COPY.saving)
                    : pick(siteLocale,COPY.saveTimezone)}
                </Button>
                {timeZoneStatus === "saved" && (
                  <span className="text-sm text-[var(--success)]">{pick(siteLocale,COPY.saved)}</span>
                )}
                {timeZoneStatus === "error" && (
                  <span className="text-sm text-[var(--destructive)]">
                    {pick(siteLocale,COPY.saveError)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{pick(siteLocale,COPY.privacyTitle)}</CardTitle>
              <CardDescription>{pick(siteLocale,COPY.privacyBody)}</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              GDPR
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
            <p>{isEuUser ? pick(siteLocale,COPY.euNotice) : pick(siteLocale,COPY.otherNotice)}</p>
            <p className="mt-1 text-xs">
              {hasConsentDecision && consentTimestamp
                ? `${pick(siteLocale,COPY.lastSaved)}: ${formatConsentTimestamp(consentTimestamp)}`
                : pick(siteLocale,COPY.noConsent)}
            </p>
          </div>

          <div className="space-y-3">
            <ConsentToggle
              checked={consentDraft.analytics}
              label={pick(siteLocale,COPY.analytics)}
              description={pick(siteLocale,COPY.analyticsBody)}
              onCheckedChange={(checked) => setConsentDraft((current) => ({ ...current, analytics: checked }))}
            />
            <ConsentToggle
              checked={consentDraft.sessionReplay}
              label={pick(siteLocale,COPY.replay)}
              description={pick(siteLocale,COPY.replayBody)}
              onCheckedChange={(checked) => setConsentDraft((current) => ({ ...current, sessionReplay: checked }))}
            />
            <ConsentToggle
              checked={consentDraft.marketing}
              label={pick(siteLocale,COPY.marketing)}
              description={pick(siteLocale,COPY.marketingBody)}
              onCheckedChange={(checked) => setConsentDraft((current) => ({ ...current, marketing: checked }))}
            />
            <ConsentToggle
              checked
              disabled
              label={pick(siteLocale,COPY.necessary)}
              description={pick(siteLocale,COPY.necessaryBody)}
              onCheckedChange={() => undefined}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={() => void savePreferences(consentDraft, "settings_update")} disabled={isSaving || !consentChanged}>
              {pick(siteLocale,COPY.savePrivacy)}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void withdrawConsent()}
              disabled={isSaving || JSON.stringify(consent) === JSON.stringify(getDefaultConsent())}
            >
              {pick(siteLocale,COPY.withdraw)}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--destructive)]/10 text-[var(--destructive)]">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(siteLocale,COPY.accountTitle)}</CardTitle>
              <CardDescription>{pick(siteLocale,COPY.accountBody)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Link href="/profile" className={buttonVariants({ variant: "default" })}>
            {pick(siteLocale,COPY.openProfile)}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(siteLocale,COPY.supportTitle)}</CardTitle>
              <CardDescription>{pick(siteLocale,COPY.supportBody)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/help"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
          >
            {pick(siteLocale,COPY.help)}
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-elevated)] px-5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)]"
          >
            {pick(siteLocale,COPY.contact)}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
