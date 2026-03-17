"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FaqAccordion } from "@/components/ui/accordion";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: {
      en: "How does Fazumi work?",
      ar: "كيف يعمل فازومي؟",
      es: "¿Cómo funciona Fazumi?",
      "pt-BR": "Como o Fazumi funciona?",
      id: "Bagaimana cara kerja Fazumi?",
    },
    answer: {
      en: "Paste school chat text from WhatsApp, Telegram, or Facebook, or upload the export. Fazumi turns it into one action-ready family dashboard with dates, tasks, fees, forms, supplies, and follow-up questions.",
      ar: "الصق نص محادثة المدرسة من واتساب أو تيليجرام أو فيسبوك، أو ارفع ملف التصدير. يحوله فازومي إلى لوحة عائلية واحدة جاهزة للتنفيذ تضم التواريخ والمهام والرسوم والنماذج والمستلزمات وأسئلة المتابعة.",
      es: "Pega el texto de un chat escolar de WhatsApp, Telegram o Facebook, o sube el archivo exportado. Fazumi lo convierte en un panel familiar listo para actuar, con fechas, tareas, cuotas, formularios, materiales y preguntas de seguimiento.",
      "pt-BR": "Cole o texto de um chat escolar do WhatsApp, Telegram ou Facebook, ou envie o arquivo exportado. O Fazumi transforma isso em um painel familiar pronto para a ação, com datas, tarefas, taxas, formulários, materiais e perguntas de acompanhamento.",
      id: "Tempel teks obrolan sekolah dari WhatsApp, Telegram, atau Facebook, atau unggah file ekspornya. Fazumi mengubahnya menjadi satu dasbor keluarga yang siap ditindaklanjuti, lengkap dengan tanggal, tugas, biaya, formulir, perlengkapan, dan pertanyaan tindak lanjut.",
    },
  },
  {
    question: {
      en: "Is my chat data private?",
      ar: "هل بيانات المحادثة خاصة؟",
      es: "¿Mis datos del chat son privados?",
      "pt-BR": "Meus dados do chat são privados?",
      id: "Apakah data obrolan saya aman?",
    },
    answer: {
      en: "Your raw chat text is never stored. Only the structured summary — dates, action items, links — is saved to your history. The original messages are processed in memory and discarded.",
      ar: "نص محادثتك الأصلي لا يُخزَّن أبدًا. يتم حفظ الملخص المنظَّم فقط — المواعيد وبنود الإجراءات والروابط. تتم معالجة الرسائل الأصلية في الذاكرة وتجاهلها.",
      es: "El texto original del chat nunca se almacena. Solo se guarda el resumen estructurado — fechas, tareas y enlaces — en tu historial. Los mensajes originales se procesan en memoria y se descartan.",
      "pt-BR": "O texto bruto do chat nunca é armazenado. Apenas o resumo estruturado — datas, itens de ação e links — é salvo no seu histórico. As mensagens originais são processadas na memória e descartadas.",
      id: "Teks obrolan asli Anda tidak pernah disimpan. Hanya ringkasan terstruktur — tanggal, item tindakan, dan tautan — yang disimpan di riwayat Anda. Pesan asli diproses di memori dan langsung dihapus.",
    },
  },
  {
    question: {
      en: "How many free summaries do I get?",
      ar: "كم عدد الملخصات المجانية التي أحصل عليها؟",
      es: "¿Cuántos resúmenes gratuitos obtengo?",
      "pt-BR": "Quantos resumos gratuitos recebo?",
      id: "Berapa banyak ringkasan gratis yang saya dapatkan?",
    },
    answer: {
      en: "Every new account starts with a 7-day free trial that includes 3 summaries per day. After the trial ends, you keep 3 lifetime free summaries unless you upgrade.",
      ar: "يبدأ كل حساب جديد بتجربة مجانية لمدة 7 أيام تشمل 3 ملخصات يوميًا. بعد انتهاء التجربة تحتفظ بثلاثة ملخصات مجانية مدى الحياة ما لم تقم بالترقية.",
      es: "Cada cuenta nueva comienza con una prueba gratuita de 7 días que incluye 3 resúmenes por día. Después de la prueba, conservas 3 resúmenes gratuitos de por vida, salvo que hagas un upgrade.",
      "pt-BR": "Cada conta nova começa com um teste gratuito de 7 dias que inclui 3 resumos por dia. Após o término do teste, você mantém 3 resumos gratuitos para sempre, a menos que faça um upgrade.",
      id: "Setiap akun baru dimulai dengan uji coba gratis 7 hari yang mencakup 3 ringkasan per hari. Setelah uji coba berakhir, Anda tetap mendapatkan 3 ringkasan gratis seumur hidup kecuali Anda melakukan upgrade.",
    },
  },
  {
    question: {
      en: "Can I share summaries with my spouse?",
      ar: "هل يمكنني مشاركة الملخصات مع زوجي أو زوجتي؟",
      es: "¿Puedo compartir resúmenes con mi pareja?",
      "pt-BR": "Posso compartilhar resumos com meu cônjuge?",
      id: "Bisakah saya berbagi ringkasan dengan pasangan?",
    },
    answer: {
      en: "Yes. You can export a summary as a plain-text file and share it via WhatsApp, Telegram, or any messaging app. Family sharing features are on the roadmap.",
      ar: "نعم. يمكنك تصدير الملخص كملف نصي ومشاركته عبر واتساب أو تيليجرام أو أي تطبيق مراسلة. ميزات المشاركة العائلية قادمة قريبًا.",
      es: "Sí. Puedes exportar un resumen como archivo de texto y compartirlo por WhatsApp, Telegram o cualquier app de mensajería. Las funciones de compartir en familia están en la hoja de ruta.",
      "pt-BR": "Sim. Você pode exportar um resumo como arquivo de texto e compartilhá-lo pelo WhatsApp, Telegram ou qualquer aplicativo de mensagens. Os recursos de compartilhamento familiar estão no roadmap.",
      id: "Ya. Anda bisa mengekspor ringkasan sebagai file teks dan membagikannya melalui WhatsApp, Telegram, atau aplikasi pesan apa pun. Fitur berbagi antar anggota keluarga sedang dalam pengembangan.",
    },
  },
  {
    question: {
      en: "Does it work with Arabic chats?",
      ar: "هل يعمل مع المحادثات العربية؟",
      es: "¿Funciona con chats en árabe?",
      "pt-BR": "Funciona com chats em árabe?",
      id: "Apakah bisa digunakan untuk obrolan berbahasa Arab?",
    },
    answer: {
      en: "Yes. Fazumi auto-detects Arabic input and returns summaries in Arabic. You can also force Arabic output for any language input using the language selector.",
      ar: "نعم. يكتشف Fazumi العربية تلقائيًا ويُنتج الملخصات بالعربية. يمكنك أيضًا إجبار الإخراج بالعربية لأي لغة مدخلة باستخدام محدد اللغة.",
      es: "Sí. Fazumi detecta automáticamente el árabe y devuelve los resúmenes en árabe. También puedes forzar la salida en árabe para cualquier idioma de entrada usando el selector de idioma.",
      "pt-BR": "Sim. O Fazumi detecta automaticamente o árabe e retorna os resumos em árabe. Você também pode forçar a saída em árabe para qualquer idioma de entrada usando o seletor de idioma.",
      id: "Ya. Fazumi secara otomatis mendeteksi input dalam bahasa Arab dan mengembalikan ringkasan dalam bahasa Arab. Anda juga bisa memaksa output dalam bahasa Arab untuk input bahasa apa pun menggunakan pemilih bahasa.",
    },
  },
  {
    question: {
      en: "What if I exceed my limit?",
      ar: "ماذا يحدث إذا تجاوزت الحد؟",
      es: "¿Qué pasa si supero mi límite?",
      "pt-BR": "O que acontece se eu ultrapassar meu limite?",
      id: "Apa yang terjadi jika saya melampaui batas saya?",
    },
    answer: {
      en: "Your saved summaries stay available. To create more summaries, wait for the next daily reset if you are in trial, or upgrade to Pro for higher daily limits.",
      ar: "تبقى ملخصاتك المحفوظة متاحة. ولإنشاء المزيد من الملخصات يمكنك انتظار إعادة الضبط اليومية التالية إذا كنت في الفترة التجريبية أو الترقية إلى Pro لحدود أعلى يوميًا.",
      es: "Tus resúmenes guardados siguen disponibles. Para crear más, espera el siguiente reinicio diario si estás en período de prueba, o pasa a Pro para obtener límites diarios más altos.",
      "pt-BR": "Seus resumos salvos continuam disponíveis. Para criar mais resumos, aguarde a próxima redefinição diária se você está no período de teste, ou faça upgrade para o Pro para obter limites diários mais altos.",
      id: "Ringkasan yang tersimpan tetap tersedia. Untuk membuat lebih banyak ringkasan, tunggu reset harian berikutnya jika Anda masih dalam masa uji coba, atau upgrade ke Pro untuk batas harian yang lebih tinggi.",
    },
  },
  {
    question: {
      en: "How do I cancel my subscription?",
      ar: "كيف ألغي الاشتراك؟",
      es: "¿Cómo cancelo mi suscripción?",
      "pt-BR": "Como cancelo minha assinatura?",
      id: "Bagaimana cara membatalkan langganan saya?",
    },
    answer: {
      en: "Open the billing page after signing in and use the billing portal linked there to manage or cancel your subscription. Cancellation stops future renewals, and paid access follows the latest subscription status in your account.",
      ar: "افتح صفحة الفوترة بعد تسجيل الدخول واستخدم بوابة الفوترة المرتبطة هناك لإدارة الاشتراك أو إلغائه. ويؤدي الإلغاء إلى إيقاف التجديدات المستقبلية، بينما يتبع الوصول المدفوع أحدث حالة اشتراك ظاهرة في حسابك.",
      es: "Abre la página de facturación después de iniciar sesión y usa el portal de facturación enlazado allí para gestionar o cancelar tu suscripción. La cancelación detiene las renovaciones futuras y el acceso de pago sigue el estado más reciente de la suscripción en tu cuenta.",
      "pt-BR": "Abra a página de faturamento após fazer login e use o portal de faturamento vinculado lá para gerenciar ou cancelar sua assinatura. O cancelamento encerra as renovações futuras e o acesso pago segue o status mais recente da assinatura na sua conta.",
      id: "Buka halaman tagihan setelah masuk dan gunakan portal penagihan yang tertaut di sana untuk mengelola atau membatalkan langganan Anda. Pembatalan menghentikan pembaruan selanjutnya, dan akses berbayar mengikuti status langganan terbaru di akun Anda.",
    },
  },
  {
    question: {
      en: "What is the refund policy for paid plans?",
      ar: "ما سياسة الاسترداد للخطط المدفوعة؟",
      es: "¿Cuál es la política de reembolso para los planes de pago?",
      "pt-BR": "Qual é a política de reembolso para planos pagos?",
      id: "Apa kebijakan pengembalian dana untuk paket berbayar?",
    },
    answer: {
      en: "You can request a refund within 14 days of the initial purchase date for a paid Fazumi plan. The authorised payment partner or Merchant of Record shown at checkout handles the final billing workflow.",
      ar: "يمكنك طلب استرداد المبلغ خلال 14 يومًا من تاريخ الشراء الأول لأي خطة مدفوعة في فازومي. ويتولى شريك الدفع المعتمد أو التاجر الرسمي الموضح عند الدفع الخطوات النهائية للفوترة.",
      es: "Puedes solicitar un reembolso dentro de los 14 días posteriores a la fecha de compra inicial de un plan de Fazumi de pago. El socio de pago autorizado o el Merchant of Record que aparece al pagar gestiona el flujo de facturación final.",
      "pt-BR": "Você pode solicitar um reembolso dentro de 14 dias da data de compra inicial de um plano Fazumi pago. O parceiro de pagamento autorizado ou o Merchant of Record exibido no checkout gerencia o fluxo de cobrança final.",
      id: "Anda dapat meminta pengembalian dana dalam 14 hari sejak tanggal pembelian awal paket Fazumi berbayar. Mitra pembayaran resmi atau Merchant of Record yang ditampilkan saat checkout menangani proses penagihan akhir.",
    },
  },
] as const;

const COPY = {
  eyebrow: {
    en: "FAQ",
    ar: "الأسئلة الشائعة",
    es: "Preguntas frecuentes",
    "pt-BR": "Perguntas frequentes",
    id: "Pertanyaan Umum",
  },
  title: {
    en: "Answers before you commit",
    ar: "إجابات قبل أن تشترك",
    es: "Respuestas antes de comprometerte",
    "pt-BR": "Respostas antes de se comprometer",
    id: "Jawaban sebelum Anda memutuskan",
  },
  subtitle: {
    en: "Common questions before your free trial.",
    ar: "أسئلة شائعة قبل بدء تجربتك المجانية.",
    es: "Preguntas comunes antes de tu prueba gratuita.",
    "pt-BR": "Dúvidas comuns antes do seu teste gratuito.",
    id: "Pertanyaan umum sebelum uji coba gratis Anda.",
  },
  more: {
    en: "View the full FAQ page",
    ar: "عرض صفحة الأسئلة الشائعة كاملة",
    es: "Ver la página completa de preguntas frecuentes",
    "pt-BR": "Ver a página completa de perguntas frequentes",
    id: "Lihat halaman pertanyaan umum lengkap",
  },
} satisfies Record<string, LocalizedCopy<string>>;

interface FAQAccordionProps {
  showHeading?: boolean;
  showMoreLink?: boolean;
  className?: string;
}

export function FAQAccordion({
  showHeading = true,
  showMoreLink = true,
  className,
}: FAQAccordionProps) {
  const { siteLocale } = useLang();


  return (
    <section
      dir={siteLocale === "ar" ? "rtl" : "ltr"}
      lang={siteLocale}
      className={cn(siteLocale === "ar" && "font-arabic", className)}
    >
      <div className="mx-auto max-w-4xl">
        {showHeading ? (
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
        ) : null}

        <FaqAccordion
          items={FAQS.map((item) => ({
            question: pick(item.question, siteLocale),
            answer: pick(item.answer, siteLocale),
          }))}
          defaultOpenFirst
          className={cn("surface-panel bg-[var(--surface-elevated)] px-5 sm:px-6", showHeading && "mt-8")}
          buttonClassName="min-h-12 py-5"
          questionClassName="text-[var(--text-base)] font-semibold text-[var(--foreground)]"
          contentClassName="pb-5"
          answerClassName="mt-3 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]"
        />

        {showMoreLink ? (
          <div className="mt-6 flex justify-center">
            <Link
              href="/faq"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-2.5 text-[var(--text-sm)] font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              {pick(COPY.more, siteLocale)}
              <ArrowRight className={cn("h-4 w-4", siteLocale === "ar" && "rotate-180")} />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
