"use client";

import Link from "next/link";
import { HelpCircle, Mail } from "lucide-react";
import { FaqAccordion } from "@/components/ui/accordion";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BILLING_CONTACT_EMAIL, LEGAL_CONTACT_EMAIL } from "@/lib/config/legal";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_MB = formatNumber(10);
const MAX_CHARS = formatNumber(30_000);

const COPY = {
  eyebrow: {
    en: "Support",
    ar: "الدعم",
    es: "Soporte",
    "pt-BR": "Suporte",
    id: "Dukungan",
  },
  title: {
    en: "Help & Support",
    ar: "المساعدة والدعم",
    es: "Ayuda y soporte",
    "pt-BR": "Ajuda e suporte",
    id: "Bantuan & Dukungan",
  },
  description: {
    en: "Practical guidance for getting started, uploads, privacy, language, billing, and troubleshooting.",
    ar: "دليل عملي للبدء والرفع والخصوصية واللغة والفوترة ومعالجة المشكلات الشائعة.",
    es: "Guía práctica para comenzar, cargas, privacidad, idioma, facturación y resolución de problemas.",
    "pt-BR": "Orientações práticas para começar, uploads, privacidade, idioma, faturamento e resolução de problemas.",
    id: "Panduan praktis untuk memulai, mengunggah, privasi, bahasa, tagihan, dan pemecahan masalah.",
  },
  sections: [
    {
      title: {
        en: "Getting started",
        ar: "البدء",
        es: "Cómo empezar",
        "pt-BR": "Como começar",
        id: "Memulai",
      },
      body: {
        en: "Start by pasting school-group text into the summarize box or by uploading a supported export.",
        ar: "ابدأ بلصق نص محادثة المدرسة في مربع التلخيص أو برفع ملف مدعوم.",
        es: "Comienza pegando el texto del grupo escolar en el cuadro de resumen o subiendo una exportación compatible.",
        "pt-BR": "Comece colando o texto do grupo escolar na caixa de resumo ou enviando uma exportação compatível.",
        id: "Mulai dengan menempel teks grup sekolah ke kotak ringkasan atau mengunggah ekspor yang didukung.",
      },
      items: {
        en: [
          "You can paste copied text from WhatsApp, Telegram, or Facebook Messenger.",
          "WhatsApp export .txt files are supported.",
          "You can also upload a .zip that contains text files only.",
        ],
        ar: [
          "يمكنك لصق النص المنسوخ من WhatsApp أو Telegram أو Facebook Messenger.",
          "كما يدعم Fazumi ملفات تصدير WhatsApp بصيغة .txt.",
          "ويمكنك أيضًا رفع ملف .zip يحتوي على ملفات نصية فقط.",
        ],
        es: [
          "Puedes pegar texto copiado de WhatsApp, Telegram o Facebook Messenger.",
          "Los archivos de exportación .txt de WhatsApp son compatibles.",
          "También puedes subir un .zip que contenga solo archivos de texto.",
        ],
        "pt-BR": [
          "Você pode colar texto copiado do WhatsApp, Telegram ou Facebook Messenger.",
          "Arquivos de exportação .txt do WhatsApp são suportados.",
          "Você também pode enviar um .zip que contenha apenas arquivos de texto.",
        ],
        id: [
          "Anda dapat menempel teks yang disalin dari WhatsApp, Telegram, atau Facebook Messenger.",
          "File ekspor .txt WhatsApp didukung.",
          "Anda juga dapat mengunggah .zip yang hanya berisi file teks.",
        ],
      },
    },
    {
      title: {
        en: "Uploads",
        ar: "الملفات المرفوعة",
        es: "Archivos",
        "pt-BR": "Uploads",
        id: "Unggahan",
      },
      body: {
        en: "Keep uploads focused and text-only so summarization stays reliable.",
        ar: "احرص على أن تكون الملفات المرفوعة مركزة ونصية فقط حتى يبقى التلخيص موثوقًا.",
        es: "Mantén los archivos centrados y solo de texto para que el resumen sea confiable.",
        "pt-BR": "Mantenha os uploads com foco e somente em texto para que a geração de resumos seja confiável.",
        id: "Jaga agar unggahan terfokus dan hanya berisi teks agar ringkasan tetap andal.",
      },
      items: {
        en: [
          `Maximum upload size: ${MAX_UPLOAD_MB}MB.`,
          `Maximum processed text length: ${MAX_CHARS} characters.`,
          "Media inside a zip is ignored.",
          "If a zip does not contain readable text, the summary request will fail.",
        ],
        ar: [
          `الحد الأقصى لحجم الرفع: ${MAX_UPLOAD_MB}MB.`,
          `الحد الأقصى للنص الذي تتم معالجته: ${MAX_CHARS} حرف.`,
          "ويتم تجاهل الصور والفيديو والوسائط داخل ملفات zip.",
          "وإذا لم يتضمن ملف zip نصًا مقروءًا فلن يكتمل طلب التلخيص.",
        ],
        es: [
          `Tamaño máximo de subida: ${MAX_UPLOAD_MB}MB.`,
          `Longitud máxima de texto procesado: ${MAX_CHARS} caracteres.`,
          "Los archivos multimedia dentro de un zip se ignoran.",
          "Si un zip no contiene texto legible, la solicitud de resumen fallará.",
        ],
        "pt-BR": [
          `Tamanho máximo de upload: ${MAX_UPLOAD_MB}MB.`,
          `Comprimento máximo de texto processado: ${MAX_CHARS} caracteres.`,
          "Mídias dentro de um zip são ignoradas.",
          "Se um zip não contiver texto legível, a solicitação de resumo falhará.",
        ],
        id: [
          `Ukuran unggah maksimum: ${MAX_UPLOAD_MB}MB.`,
          `Panjang teks yang diproses maksimum: ${MAX_CHARS} karakter.`,
          "Media di dalam zip diabaikan.",
          "Jika zip tidak mengandung teks yang dapat dibaca, permintaan ringkasan akan gagal.",
        ],
      },
    },
    {
      title: {
        en: "Privacy",
        ar: "الخصوصية",
        es: "Privacidad",
        "pt-BR": "Privacidade",
        id: "Privasi",
      },
      body: {
        en: "Your raw chat text is processed transiently to generate the summary and is not stored in your account history.",
        ar: "يتم التعامل مع نص المحادثة الخام بشكل عابر لإنشاء الملخص، ولا يُحفَظ ضمن سجل حسابك.",
        es: "El texto de tu chat en bruto se procesa de forma transitoria para generar el resumen y no se almacena en el historial de tu cuenta.",
        "pt-BR": "O texto bruto do seu chat é processado transitoriamente para gerar o resumo e não é armazenado no histórico da sua conta.",
        id: "Teks chat mentah Anda diproses secara sementara untuk menghasilkan ringkasan dan tidak disimpan dalam riwayat akun Anda.",
      },
      items: {
        en: [
          "Fazumi stores the summary output and structured extracted items only.",
          "Raw pasted chats are not saved to the database.",
          "If you contact support, avoid sending full raw chats unless absolutely necessary.",
        ],
        ar: [
          "ويحفظ Fazumi ناتج الملخص والعناصر المنظمة المستخرجة فقط.",
          "أما نصوص المحادثات الخام فلا يتم حفظها في قاعدة البيانات.",
          "وعند التواصل مع الدعم، تجنب إرسال المحادثة كاملة إلا إذا كان ذلك ضروريًا للغاية.",
        ],
        es: [
          "Fazumi almacena solo el resultado del resumen y los elementos estructurados extraídos.",
          "Los chats pegados en bruto no se guardan en la base de datos.",
          "Si contactas con el soporte, evita enviar chats en bruto completos a menos que sea absolutamente necesario.",
        ],
        "pt-BR": [
          "Fazumi armazena apenas o resultado do resumo e os itens estruturados extraídos.",
          "Chats colados brutos não são salvos no banco de dados.",
          "Se você entrar em contato com o suporte, evite enviar chats brutos completos a menos que seja absolutamente necessário.",
        ],
        id: [
          "Fazumi menyimpan hanya hasil ringkasan dan item terstruktur yang diekstrak.",
          "Chat mentah yang ditempel tidak disimpan ke basis data.",
          "Jika Anda menghubungi dukungan, hindari mengirim chat mentah lengkap kecuali benar-benar diperlukan.",
        ],
      },
    },
    {
      title: {
        en: "Language",
        ar: "اللغة",
        es: "Idioma",
        "pt-BR": "Idioma",
        id: "Bahasa",
      },
      body: {
        en: "Summary language is controlled separately from the site UI language.",
        ar: "لغة الملخص يتم التحكم فيها بشكل منفصل عن لغة واجهة الموقع.",
        es: "El idioma del resumen se controla por separado del idioma de la interfaz del sitio.",
        "pt-BR": "O idioma do resumo é controlado separadamente do idioma da interface do site.",
        id: "Bahasa ringkasan dikontrol secara terpisah dari bahasa antarmuka situs.",
      },
      items: {
        en: [
          "Auto follows the dominant language detected in the text.",
          "EN forces English summary output.",
          "AR forces Standard Arabic summary output.",
          "The site can stay in English while the summary is generated in Arabic, and vice versa.",
        ],
        ar: [
          "Auto يتبع اللغة الغالبة التي يكتشفها النظام داخل النص.",
          "EN يفرض إخراج الملخص باللغة الإنجليزية.",
          "AR يفرض إخراج الملخص بالعربية الفصحى.",
          "ويمكن أن تبقى واجهة الموقع بالإنجليزية بينما يُنشأ الملخص بالعربية، أو العكس.",
        ],
        es: [
          "Auto sigue el idioma dominante detectado en el texto.",
          "EN fuerza la salida del resumen en inglés.",
          "AR fuerza la salida del resumen en árabe estándar.",
          "El sitio puede permanecer en inglés mientras el resumen se genera en árabe, y viceversa.",
        ],
        "pt-BR": [
          "Auto segue o idioma dominante detectado no texto.",
          "EN força a saída do resumo em inglês.",
          "AR força a saída do resumo em árabe padrão.",
          "O site pode permanecer em inglês enquanto o resumo é gerado em árabe, e vice-versa.",
        ],
        id: [
          "Auto mengikuti bahasa dominan yang terdeteksi dalam teks.",
          "EN memaksa output ringkasan dalam bahasa Inggris.",
          "AR memaksa output ringkasan dalam bahasa Arab standar.",
          "Situs dapat tetap dalam bahasa Inggris sementara ringkasan dibuat dalam bahasa Arab, dan sebaliknya.",
        ],
      },
    },
    {
      title: {
        en: "Billing",
        ar: "الفوترة",
        es: "Facturación",
        "pt-BR": "Faturamento",
        id: "Tagihan",
      },
      body: {
        en: "Upgrade from the pricing page or manage your plan from the billing page when you are signed in.",
        ar: "يمكنك الترقية من صفحة التسعير أو إدارة خطتك من صفحة الفوترة بعد تسجيل الدخول.",
        es: "Actualiza desde la página de precios o gestiona tu plan desde la página de facturación cuando hayas iniciado sesión.",
        "pt-BR": "Faça upgrade pela página de preços ou gerencie seu plano pela página de faturamento quando estiver conectado.",
        id: "Tingkatkan dari halaman harga atau kelola paket Anda dari halaman tagihan saat masuk.",
      },
      items: {
        en: [
          "Use /pricing to choose a plan and /billing to manage it later.",
          "If a subscription becomes past_due, paid access may be interrupted until payment details are updated.",
          `Refund requests can be made within 14 days of the initial purchase, and billing questions can be sent to ${BILLING_CONTACT_EMAIL}.`,
        ],
        ar: [
          "استخدم /pricing لاختيار الخطة و /billing لإدارتها لاحقًا.",
          "وإذا أصبحت حالة الاشتراك past_due فقد تتأثر المزايا المدفوعة إلى أن يتم تحديث بيانات الدفع.",
          `يمكن طلب الاسترداد خلال 14 يومًا من تاريخ الشراء الأول، ويمكن إرسال استفسارات الفوترة إلى ${BILLING_CONTACT_EMAIL}.`,
        ],
        es: [
          "Usa /pricing para elegir un plan y /billing para gestionarlo más adelante.",
          "Si una suscripción queda en estado past_due, el acceso de pago puede interrumpirse hasta que se actualicen los datos de pago.",
          `Las solicitudes de reembolso se pueden realizar dentro de los 14 días de la compra inicial, y las preguntas de facturación se pueden enviar a ${BILLING_CONTACT_EMAIL}.`,
        ],
        "pt-BR": [
          "Use /pricing para escolher um plano e /billing para gerenciá-lo depois.",
          "Se uma assinatura ficar em past_due, o acesso pago pode ser interrompido até que os detalhes de pagamento sejam atualizados.",
          `Solicitações de reembolso podem ser feitas dentro de 14 dias da compra inicial, e dúvidas sobre faturamento podem ser enviadas para ${BILLING_CONTACT_EMAIL}.`,
        ],
        id: [
          "Gunakan /pricing untuk memilih paket dan /billing untuk mengelolanya nanti.",
          "Jika langganan menjadi past_due, akses berbayar dapat terganggu sampai detail pembayaran diperbarui.",
          `Permintaan pengembalian dana dapat dilakukan dalam 14 hari setelah pembelian awal, dan pertanyaan penagihan dapat dikirim ke ${BILLING_CONTACT_EMAIL}.`,
        ],
      },
    },
  ],
  troubleshooting: {
    title: {
      en: "Troubleshooting",
      ar: "استكشاف المشكلات",
      es: "Solución de problemas",
      "pt-BR": "Solução de problemas",
      id: "Pemecahan masalah",
    },
    body: {
      en: "Try these first if something is not working as expected.",
      ar: "جرّب هذه الخطوات أولًا إذا لم يعمل شيء كما تتوقع.",
      es: "Prueba esto primero si algo no funciona como se espera.",
      "pt-BR": "Tente isso primeiro se algo não estiver funcionando como esperado.",
      id: "Coba ini terlebih dahulu jika ada yang tidak berjalan sesuai harapan.",
    },
    items: [
      {
        question: {
          en: "I cannot sign in",
          ar: "لا أستطيع تسجيل الدخول",
          es: "No puedo iniciar sesión",
          "pt-BR": "Não consigo fazer login",
          id: "Saya tidak bisa masuk",
        },
        answer: {
          en: "Retry with the same sign-in provider, allow pop-ups if your browser blocks them, and then contact support if the issue continues.",
          ar: "أعد المحاولة باستخدام نفس جهة تسجيل الدخول، واسمح بالنوافذ المنبثقة إذا كان المتصفح يحظرها، ثم تواصل مع الدعم إذا استمرت المشكلة.",
          es: "Reintenta con el mismo proveedor de inicio de sesión, permite las ventanas emergentes si tu navegador las bloquea y luego contacta con el soporte si el problema continúa.",
          "pt-BR": "Tente novamente com o mesmo provedor de login, permita pop-ups se o navegador os bloquear e entre em contato com o suporte se o problema continuar.",
          id: "Coba lagi dengan penyedia masuk yang sama, izinkan pop-up jika browser Anda memblokir, lalu hubungi dukungan jika masalah berlanjut.",
        },
      },
      {
        question: {
          en: "The summary request failed",
          ar: "فشل طلب التلخيص",
          es: "La solicitud de resumen falló",
          "pt-BR": "A solicitação de resumo falhou",
          id: "Permintaan ringkasan gagal",
        },
        answer: {
          en: "Shorten very long text, remove unsupported files, and try again. Zip uploads must contain readable text only.",
          ar: "قصّر النص إذا كان طويلًا جدًا، وأزل الملفات غير المدعومة، ثم أعد المحاولة. ويجب أن يحتوي ملف zip على نص قابل للقراءة فقط.",
          es: "Acorta el texto si es muy largo, elimina los archivos no compatibles y vuelve a intentarlo. Los archivos zip deben contener solo texto legible.",
          "pt-BR": "Encurte textos muito longos, remova arquivos não suportados e tente novamente. Uploads zip devem conter apenas texto legível.",
          id: "Persingkat teks yang terlalu panjang, hapus file yang tidak didukung, dan coba lagi. Upload zip harus hanya berisi teks yang dapat dibaca.",
        },
      },
      {
        question: {
          en: "I reached my limits",
          ar: "وصلت إلى الحد المسموح",
          es: "Llegué a mis límites",
          "pt-BR": "Atingi meus limites",
          id: "Saya mencapai batas",
        },
        answer: {
          en: "Daily or free-plan limits can block new summaries. Upgrade on the pricing page or wait for the next daily reset if your plan includes one.",
          ar: "قد تمنعك الحدود اليومية أو حدود الخطة المجانية من إنشاء ملخصات جديدة. يمكنك الترقية من صفحة التسعير أو انتظار إعادة الضبط اليومية التالية إذا كانت خطتك تسمح بذلك.",
          es: "Los límites diarios o del plan gratuito pueden bloquear nuevos resúmenes. Actualiza en la página de precios o espera el próximo restablecimiento diario si tu plan lo incluye.",
          "pt-BR": "Limites diários ou do plano gratuito podem bloquear novos resumos. Faça upgrade na página de preços ou aguarde o próximo reset diário se o seu plano incluir um.",
          id: "Batas harian atau paket gratis dapat memblokir ringkasan baru. Tingkatkan di halaman harga atau tunggu reset harian berikutnya jika paket Anda menyertakannya.",
        },
      },
      {
        question: {
          en: "I still need help",
          ar: "هل لا تزال تحتاج مساعدة؟",
          es: "Sigo necesitando ayuda",
          "pt-BR": "Ainda preciso de ajuda",
          id: "Saya masih butuh bantuan",
        },
        answer: {
          en: `Email ${LEGAL_CONTACT_EMAIL} with your account email, a short description, and a screenshot if useful. Do not include full raw chats unless absolutely necessary.`,
          ar: `راسل ${LEGAL_CONTACT_EMAIL} مع بريد حسابك ووصف مختصر للمشكلة ولقطة شاشة إن كانت مفيدة. ولا ترسل المحادثة الخام كاملة إلا إذا كان ذلك ضروريًا للغاية.`,
          es: `Envía un correo a ${LEGAL_CONTACT_EMAIL} con tu correo de cuenta, una descripción breve y una captura de pantalla si es útil. No incluyas chats en bruto completos a menos que sea absolutamente necesario.`,
          "pt-BR": `Envie um e-mail para ${LEGAL_CONTACT_EMAIL} com seu e-mail de conta, uma breve descrição e uma captura de tela se for útil. Não inclua chats brutos completos a menos que seja absolutamente necessário.`,
          id: `Kirim email ke ${LEGAL_CONTACT_EMAIL} dengan email akun Anda, deskripsi singkat, dan tangkapan layar jika berguna. Jangan sertakan chat mentah lengkap kecuali benar-benar diperlukan.`,
        },
      },
    ],
  },
  support: {
    title: {
      en: "Contact support",
      ar: "اتصل بالدعم",
      es: "Contactar soporte",
      "pt-BR": "Contatar suporte",
      id: "Hubungi dukungan",
    },
    body: {
      en: "For product or account help, contact support. For billing or refund help, contact billing:",
      ar: "للمساعدة في المنتج أو الحساب تواصل مع الدعم. وللمساعدة في الفوترة أو الاسترداد راسل:",
      es: "Para ayuda con el producto o la cuenta, contacta con el soporte. Para ayuda con facturación o reembolsos, contacta con facturación:",
      "pt-BR": "Para ajuda com o produto ou conta, entre em contato com o suporte. Para ajuda com faturamento ou reembolsos, entre em contato com o faturamento:",
      id: "Untuk bantuan produk atau akun, hubungi dukungan. Untuk bantuan tagihan atau pengembalian dana, hubungi penagihan:",
    },
    email: LEGAL_CONTACT_EMAIL,
    billingEmail: BILLING_CONTACT_EMAIL,
  },
  links: {
    faq: {
      en: "FAQ",
      ar: "الأسئلة الشائعة",
      es: "Preguntas frecuentes",
      "pt-BR": "Perguntas frequentes",
      id: "Pertanyaan Umum",
    },
    contact: {
      en: "Contact",
      ar: "تواصل معنا",
      es: "Contacto",
      "pt-BR": "Contato",
      id: "Kontak",
    },
    pricing: {
      en: "Pricing",
      ar: "الأسعار",
      es: "Precios",
      "pt-BR": "Preços",
      id: "Harga",
    },
    status: {
      en: "System status",
      ar: "حالة النظام",
      es: "Estado del sistema",
      "pt-BR": "Status do sistema",
      id: "Status sistem",
    },
  },
};

export default function HelpPage() {
  const { siteLocale } = useLang();
  const isArabic = siteLocale === "ar";

  return (
    <PublicPageShell
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      description={COPY.description}
    >
      <div
        dir={isArabic ? "rtl" : "ltr"}
        lang={siteLocale}
        className="space-y-4"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {COPY.sections.map((section) => {
            const items = pick<string[]>(section.items, siteLocale) ?? [];

            return (
              <Card key={section.title.en}>
                <CardHeader className={cn(isArabic && "text-right")}>
                  <CardTitle>{pick(section.title, siteLocale)}</CardTitle>
                </CardHeader>
                <CardContent className={cn("space-y-3", isArabic && "text-right")}>
                  <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                    {pick(section.body, siteLocale)}
                  </p>
                  <ul
                    className={cn(
                      "list-disc space-y-2 text-sm leading-7 text-[var(--muted-foreground)]",
                      isArabic ? "pr-5" : "pl-5"
                    )}
                  >
                    {items.map((item) => (
                      <li key={`${section.title.en}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className={cn(isArabic && "text-right")}>
            <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <HelpCircle className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <div>
                <CardTitle>{pick(COPY.troubleshooting.title, siteLocale)}</CardTitle>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(COPY.troubleshooting.body, siteLocale)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <FaqAccordion
              items={COPY.troubleshooting.items.map((item) => ({
                question: pick(item.question, siteLocale),
                answer: pick(item.answer, siteLocale),
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className={cn("py-5", isArabic && "text-right")}>
            <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <Mail className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {pick(COPY.support.title, siteLocale)}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {pick(COPY.support.body, siteLocale)}
                </p>
                <div className={cn("flex flex-col gap-2 pt-1", isArabic && "items-end")}>
                  <a
                    href={`mailto:${COPY.support.email}`}
                    className="inline-flex w-fit max-w-full break-all text-sm font-medium text-[var(--primary)] hover:underline"
                    dir="ltr"
                  >
                    {COPY.support.email}
                  </a>
                  <a
                    href={`mailto:${COPY.support.billingEmail}`}
                    className="inline-flex w-fit max-w-full break-all text-sm font-medium text-[var(--primary)] hover:underline"
                    dir="ltr"
                  >
                    {COPY.support.billingEmail}
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className={cn("flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]", isArabic && "justify-end")}>
        <Link href="/faq" className="hover:text-[var(--foreground)] hover:underline underline-offset-4">
          {pick(COPY.links.faq, siteLocale)}
        </Link>
        <Link href="/contact" className="hover:text-[var(--foreground)] hover:underline underline-offset-4">
          {pick(COPY.links.contact, siteLocale)}
        </Link>
        <Link href="/pricing" className="hover:text-[var(--foreground)] hover:underline underline-offset-4">
          {pick(COPY.links.pricing, siteLocale)}
        </Link>
        <Link href="/status" className="hover:text-[var(--foreground)] hover:underline underline-offset-4">
          {pick(COPY.links.status, siteLocale)}
        </Link>
      </div>
    </PublicPageShell>
  );
}
