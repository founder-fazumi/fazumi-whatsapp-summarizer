"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Globe2,
  HeartHandshake,
  Lock,
  Sparkles,
} from "lucide-react";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.com";

const aboutOrgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${APP_URL}/#organization`,
  name: "Fazumi",
  url: APP_URL,
  description:
    "Parents who built Fazumi after missing a school deadline buried in a WhatsApp group.",
  knowsAbout: [
    "School communication",
    "WhatsApp summarization",
    "Arabic-English bilingual tools",
    "Family productivity",
  ],
};

const aboutWebPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "About Fazumi",
  url: `${APP_URL}/about`,
  description:
    "Fazumi helps busy parents turn noisy school WhatsApp chats into structured summaries.",
  datePublished: "2026-02-27",
  dateModified: "2026-03-07",
  author: aboutOrgSchema,
  inLanguage: ["en", "ar"],
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "About", item: `${APP_URL}/about` },
    ],
  },
};

const COPY = {
  eyebrow: {
    en: "About",
    ar: "من نحن",
    es: "Acerca de",
    "pt-BR": "Sobre",
    id: "Tentang",
  },
  title: {
    en: "Built by parents, for parents",
    ar: "صُمم من قبل أولياء الأمور، لأولياء الأمور",
    es: "Creado por padres, para padres",
    "pt-BR": "Criado por pais, para pais",
    id: "Dibuat oleh orang tua, untuk orang tua",
  },
  description: {
    en: "Fazumi helps busy parents turn noisy school chats into clear next steps, dates, and follow-ups without endless scrolling.",
    ar: "يساعد فازومي الآباء والأمهات المشغولين على تحويل محادثات المدرسة المزدحمة إلى خطوات واضحة ومواعيد ومتابعات دون تمرير لا ينتهي.",
    es: "Fazumi ayuda a los padres ocupados a convertir los chats escolares ruidosos en próximos pasos claros, fechas y seguimientos, sin desplazarse interminablemente.",
    "pt-BR": "Fazumi ajuda pais ocupados a transformar chats escolares barulhentos em próximos passos claros, datas e acompanhamentos, sem rolar a tela sem fim.",
    id: "Fazumi membantu orang tua yang sibuk mengubah chat sekolah yang ramai menjadi langkah-langkah jelas, tanggal, dan tindak lanjut tanpa harus menggulir tanpa henti.",
  },
  originBadge: {
    en: "Built for busy school families",
    ar: "مصمم للعائلات المشغولة بمتابعة شؤون المدرسة",
    es: "Creado para familias escolares ocupadas",
    "pt-BR": "Criado para famílias escolares ocupadas",
    id: "Dibuat untuk keluarga sekolah yang sibuk",
  },
  bilingualBadge: {
    en: "Arabic + English by default",
    ar: "العربية والإنجليزية افتراضيًا",
    es: "Árabe + Inglés por defecto",
    "pt-BR": "Árabe + Inglês por padrão",
    id: "Arab + Inggris secara default",
  },
  highlights: [
    {
      title: {
        en: "Built for busy parents",
        ar: "مصمم للآباء والأمهات المشغولين",
        es: "Diseñado para padres ocupados",
        "pt-BR": "Feito para pais ocupados",
        id: "Dibuat untuk orang tua yang sibuk",
      },
      body: {
        en: "Designed for the moments when you need the update quickly, not another long scroll.",
        ar: "صُمم للحظات التي تحتاج فيها إلى التحديث بسرعة، لا إلى تمرير أطول.",
        es: "Diseñado para los momentos en que necesitas la actualización rápidamente, no otro desplazamiento largo.",
        "pt-BR": "Feito para os momentos em que você precisa da atualização rapidamente, não de mais uma rolagem longa.",
        id: "Dirancang untuk saat-saat ketika Anda butuh pembaruan cepat, bukan guliran panjang lainnya.",
      },
    },
    {
      title: {
        en: "Clarity from noisy school chats",
        ar: "وضوح وسط محادثات المدرسة المزدحمة",
        es: "Claridad en los chats escolares ruidosos",
        "pt-BR": "Clareza nos chats escolares barulhentos",
        id: "Kejelasan dari chat sekolah yang ramai",
      },
      body: {
        en: "Dates, actions, follow-ups, and context should be easy to scan and easy to share.",
        ar: "ينبغي أن تكون المواعيد والمهام والمتابعات والسياق سهلة الالتقاط وسهلة المشاركة.",
        es: "Las fechas, tareas, seguimientos y contexto deben ser fáciles de revisar y de compartir.",
        "pt-BR": "Datas, tarefas, acompanhamentos e contexto devem ser fáceis de verificar e de compartilhar.",
        id: "Tanggal, tugas, tindak lanjut, dan konteks harus mudah dipindai dan dibagikan.",
      },
    },
    {
      title: {
        en: "Privacy considered from the start",
        ar: "خصوصية حاضرة من البداية",
        es: "Privacidad considerada desde el inicio",
        "pt-BR": "Privacidade considerada desde o início",
        id: "Privasi dipertimbangkan sejak awal",
      },
      body: {
        en: "Fazumi is built to keep the useful structure, not a permanent archive of pasted chat threads.",
        ar: "صُمم فازومي للاحتفاظ بالبنية المفيدة، لا لتحويل المحادثات الملصقة إلى أرشيف دائم.",
        es: "Fazumi está diseñado para conservar la estructura útil, no para crear un archivo permanente de hilos de chat pegados.",
        "pt-BR": "Fazumi é feito para manter a estrutura útil, não para criar um arquivo permanente de conversas coladas.",
        id: "Fazumi dibuat untuk menjaga struktur yang berguna, bukan arsip permanen dari thread chat yang ditempel.",
      },
    },
  ],
  storyTitle: {
    en: "Why Fazumi exists",
    ar: "لماذا وُجد فازومي",
    es: "Por qué existe Fazumi",
    "pt-BR": "Por que o Fazumi existe",
    id: "Mengapa Fazumi ada",
  },
  storyBody: {
    en: "As parents, we once missed our daughter's science-fair deadline because the reminder was buried inside 200+ WhatsApp messages. The information was there, but the signal was lost in the noise. Fazumi started as the tool we wanted that night: paste the chat, surface the dates, identify the actions, and share the summary with the whole family before anything slips again.",
    ar: "كأولياء أمور، سبق أن فاتنا موعد معرض العلوم لابنتنا لأن التذكير كان مدفونًا داخل أكثر من 200 رسالة واتساب. كانت المعلومة موجودة، لكن الإشارة ضاعت وسط الضجيج. بدأ فازومي كالأداة التي تمنينا وجودها في تلك الليلة: الصق المحادثة، أظهر المواعيد، حدد الإجراءات، وشارك الملخص مع العائلة كلها قبل أن يفوت شيء مرة أخرى.",
    es: "Como padres, una vez perdimos la fecha límite de la feria de ciencias de nuestra hija porque el recordatorio estaba enterrado entre más de 200 mensajes de WhatsApp. La información estaba allí, pero la señal se perdió entre el ruido. Fazumi comenzó como la herramienta que queríamos esa noche: pegar el chat, mostrar las fechas, identificar las acciones y compartir el resumen con toda la familia antes de que algo se escape de nuevo.",
    "pt-BR": "Como pais, uma vez perdemos o prazo da feira de ciências da nossa filha porque o lembrete estava enterrado entre mais de 200 mensagens de WhatsApp. A informação estava lá, mas o sinal se perdeu no ruído. Fazumi começou como a ferramenta que queríamos naquela noite: colar o chat, mostrar as datas, identificar as ações e compartilhar o resumo com toda a família antes que algo passasse despercebido novamente.",
    id: "Sebagai orang tua, kami pernah melewatkan batas waktu pameran sains putri kami karena pengingatnya terkubur di antara 200+ pesan WhatsApp. Informasinya ada, tetapi sinyalnya hilang di tengah kebisingan. Fazumi dimulai sebagai alat yang kami inginkan malam itu: tempel chat, tampilkan tanggal, identifikasi tindakan, dan bagikan ringkasan ke seluruh keluarga sebelum ada yang terlewat lagi.",
  },
  founderTitle: {
    en: "How we think about the product",
    ar: "كيف نفكر في المنتج",
    es: "Cómo pensamos en el producto",
    "pt-BR": "Como pensamos no produto",
    id: "Bagaimana kami memikirkan produk ini",
  },
  founderBody: {
    en: "Fazumi is shaped by parents who balance school, work, and family logistics every day. We care about reducing friction: faster scanning on mobile, clearer language, and summaries that make it obvious what happens next.",
    ar: "يتشكل فازومي على يد أولياء أمور يوازنون يوميًا بين المدرسة والعمل وتنظيم شؤون العائلة. ما نهتم به هو تقليل الاحتكاك: قراءة أسرع على الهاتف، ولغة أوضح، وملخصات تجعل الخطوة التالية واضحة مباشرة.",
    es: "Fazumi está moldeado por padres que equilibran la escuela, el trabajo y la logística familiar todos los días. Nos importa reducir la fricción: escaneo más rápido en el móvil, lenguaje más claro y resúmenes que muestren claramente qué pasa a continuación.",
    "pt-BR": "Fazumi é moldado por pais que equilibram escola, trabalho e logística familiar todos os dias. Nos importa reduzir o atrito: leitura mais rápida no celular, linguagem mais clara e resumos que deixem óbvio o que acontece a seguir.",
    id: "Fazumi dibentuk oleh orang tua yang menyeimbangkan sekolah, pekerjaan, dan urusan keluarga setiap hari. Kami peduli tentang mengurangi hambatan: pemindaian lebih cepat di ponsel, bahasa yang lebih jelas, dan ringkasan yang menunjukkan dengan jelas apa yang harus dilakukan selanjutnya.",
  },
  founderListTitle: {
    en: "What we optimize for",
    ar: "ما الذي نركز عليه",
    es: "Lo que optimizamos",
    "pt-BR": "O que otimizamos",
    id: "Apa yang kami optimalkan",
  },
  founderList: {
    en: [
      "Useful structure before visual noise.",
      "Bilingual clarity that feels natural in English and Arabic.",
      "A calmer experience on the phone, where most parents actually use it.",
    ],
    ar: [
      "بنية مفيدة قبل أي ازدحام بصري.",
      "وضوح ثنائي اللغة يبدو طبيعيًا في العربية والإنجليزية.",
      "تجربة أهدأ على الهاتف، حيث يستخدمه معظم أولياء الأمور فعلًا.",
    ],
    es: [
      "Estructura útil antes que ruido visual.",
      "Claridad bilingüe que se siente natural en inglés y árabe.",
      "Una experiencia más tranquila en el teléfono, donde la mayoría de los padres realmente lo usan.",
    ],
    "pt-BR": [
      "Estrutura útil antes do ruído visual.",
      "Clareza bilíngue que parece natural em inglês e árabe.",
      "Uma experiência mais tranquila no celular, onde a maioria dos pais realmente o usa.",
    ],
    id: [
      "Struktur yang berguna sebelum kebisingan visual.",
      "Kejelasan bilingual yang terasa alami dalam bahasa Inggris dan Arab.",
      "Pengalaman yang lebih tenang di ponsel, tempat sebagian besar orang tua benar-benar menggunakannya.",
    ],
  },
  missionTitle: {
    en: "Our mission",
    ar: "مهمتنا",
    es: "Nuestra misión",
    "pt-BR": "Nossa missão",
    id: "Misi kami",
  },
  missionBody: {
    en: "Give parents a calmer way to understand school communication, act on time, and coordinate with family with less friction.",
    ar: "منح الأسر طريقة أهدأ لفهم تواصل المدرسة، والتصرف في الوقت المناسب، والتنسيق العائلي باحتكاك أقل.",
    es: "Dar a los padres una manera más tranquila de entender la comunicación escolar, actuar a tiempo y coordinarse con la familia con menos fricción.",
    "pt-BR": "Dar aos pais uma forma mais tranquila de entender a comunicação escolar, agir a tempo e se coordenar com a família com menos atrito.",
    id: "Memberi orang tua cara yang lebih tenang untuk memahami komunikasi sekolah, bertindak tepat waktu, dan berkoordinasi dengan keluarga dengan hambatan yang lebih sedikit.",
  },
  values: [
    {
      title: {
        en: "Privacy-first",
        ar: "الخصوصية أولًا",
        es: "Privacidad primero",
        "pt-BR": "Privacidade em primeiro lugar",
        id: "Privasi utama",
      },
      body: {
        en: "We do not save raw chat text in the summaries database or account history. Fazumi keeps the structured result needed for the product to work.",
        ar: "لا نحفظ نص المحادثة الخام في قاعدة بيانات الملخصات أو سجل الحساب. يحتفظ فازومي بالنتيجة المنظمة اللازمة لعمل المنتج.",
        es: "No guardamos el texto del chat en bruto en la base de datos de resúmenes ni en el historial de la cuenta. Fazumi conserva el resultado estructurado necesario para que el producto funcione.",
        "pt-BR": "Não salvamos o texto bruto do chat no banco de dados de resumos nem no histórico da conta. O Fazumi mantém o resultado estruturado necessário para o produto funcionar.",
        id: "Kami tidak menyimpan teks chat mentah di basis data ringkasan atau riwayat akun. Fazumi menyimpan hasil terstruktur yang diperlukan agar produk berfungsi.",
      },
      icon: Lock,
    },
    {
      title: {
        en: "Bilingual by design",
        ar: "ثنائي اللغة منذ البداية",
        es: "Bilingüe por diseño",
        "pt-BR": "Bilíngue por design",
        id: "Bilingual sejak awal",
      },
      body: {
        en: "Arabic and English support, family coordination habits, and bilingual clarity are product assumptions, not afterthoughts.",
        ar: "صُمم فازومي بالعربية والإنجليزية منذ البداية — ليس كإضافة لاحقة، بل كجزء أساسي من المنتج.",
        es: "El soporte en árabe e inglés, los hábitos de coordinación familiar y la claridad bilingüe son características del producto, no ideas de último momento.",
        "pt-BR": "O suporte em árabe e inglês, os hábitos de coordenação familiar e a clareza bilíngue são pressupostos do produto, não uma reflexão tardia.",
        id: "Dukungan bahasa Arab dan Inggris, kebiasaan koordinasi keluarga, dan kejelasan bilingual adalah asumsi produk, bukan hal yang dipikirkan belakangan.",
      },
      icon: Globe2,
    },
    {
      title: {
        en: "Clarity by default",
        ar: "الوضوح افتراضيًا",
        es: "Claridad por defecto",
        "pt-BR": "Clareza por padrão",
        id: "Kejelasan secara default",
      },
      body: {
        en: "The goal is not to show more. It is to surface the deadline, action, question, and context that matter most.",
        ar: "الهدف ليس عرض المزيد، بل إبراز الموعد والمهمة والسؤال والسياق الأكثر أهمية.",
        es: "El objetivo no es mostrar más. Es destacar la fecha límite, la acción, la pregunta y el contexto que más importan.",
        "pt-BR": "O objetivo não é mostrar mais. É destacar o prazo, a ação, a pergunta e o contexto que mais importam.",
        id: "Tujuannya bukan menampilkan lebih banyak. Melainkan menampilkan tenggat waktu, tindakan, pertanyaan, dan konteks yang paling penting.",
      },
      icon: CheckCircle2,
    },
    {
      title: {
        en: "Always improving",
        ar: "نتحسن باستمرار",
        es: "Siempre mejorando",
        "pt-BR": "Sempre melhorando",
        id: "Selalu berkembang",
      },
      body: {
        en: "We improve based on what busy parents actually need: faster scanning, clearer language, and fewer missed deadlines.",
        ar: "نحسّن المنتج بناءً على ما يحتاجه أولياء الأمور المشغولون فعلًا: قراءة أسرع، ولغة أوضح، ومواعيد لا تفوت.",
        es: "Mejoramos según lo que los padres ocupados realmente necesitan: escaneo más rápido, lenguaje más claro y menos fechas límite perdidas.",
        "pt-BR": "Melhoramos com base no que os pais ocupados realmente precisam: leitura mais rápida, linguagem mais clara e menos prazos perdidos.",
        id: "Kami berkembang berdasarkan apa yang benar-benar dibutuhkan orang tua yang sibuk: pemindaian lebih cepat, bahasa lebih jelas, dan lebih sedikit tenggat waktu yang terlewat.",
      },
      icon: Sparkles,
    },
  ],
  ctaTitle: {
    en: "Ready to try Fazumi?",
    ar: "هل أنت مستعد لتجربة فازومي؟",
    es: "¿Listo para probar Fazumi?",
    "pt-BR": "Pronto para experimentar o Fazumi?",
    id: "Siap mencoba Fazumi?",
  },
  ctaBody: {
    en: "Start your free trial and turn the next crowded school chat into one clear family-ready summary.",
    ar: "ابدأ تجربتك المجانية وحوّل المحادثة المدرسية المزدحمة التالية إلى ملخص واحد واضح وجاهز للعائلة.",
    es: "Comienza tu prueba gratuita y convierte el próximo chat escolar concurrido en un resumen claro y listo para la familia.",
    "pt-BR": "Comece sua avaliação gratuita e transforme o próximo chat escolar agitado em um resumo claro e pronto para a família.",
    id: "Mulai uji coba gratis Anda dan ubah chat sekolah yang ramai berikutnya menjadi satu ringkasan keluarga yang jelas.",
  },
  ctaButton: {
    en: "Start free trial",
    ar: "ابدأ التجربة المجانية",
    es: "Comenzar prueba gratuita",
    "pt-BR": "Iniciar avaliação gratuita",
    id: "Mulai uji coba gratis",
  },
};

export default function AboutPage() {
  const { siteLocale } = useLang();
  const isArabic = siteLocale === "ar";
  const founderList = pick<string[]>(COPY.founderList, siteLocale);

  return (
    <PublicPageShell
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      description={COPY.description}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutOrgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutWebPageSchema) }}
      />
      <div
        dir={isArabic ? "rtl" : "ltr"}
        lang={siteLocale}
        className={cn("space-y-5", isArabic && "font-arabic")}
      >
        <Card className="hero-backdrop overflow-hidden">
          <CardContent className="flex flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
            <div className={cn("flex flex-wrap items-center gap-3", isArabic && "justify-end")}>
              <BrandLogo size="lg" />
              <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)]">
                {pick(COPY.originBadge, siteLocale)}
              </span>
              <span className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)]">
                {pick(COPY.bilingualBadge, siteLocale)}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {COPY.highlights.map((highlight) => (
                <div
                  key={highlight.title.en}
                  className={cn(
                    "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-[var(--shadow-xs)]",
                    isArabic && "text-right"
                  )}
                >
                  <p className="text-lg font-semibold leading-snug text-[var(--foreground)]">
                    {pick(highlight.title, siteLocale)}
                  </p>
                  <p className="public-body-copy mt-2 text-[var(--muted-foreground)]">
                    {pick(highlight.body, siteLocale)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Card>
            <CardHeader className={cn(isArabic && "text-right")}>
              <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <CardTitle className="public-section-title">{pick(COPY.storyTitle, siteLocale)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className={cn(isArabic && "text-right")}>
              <p className="public-body-copy text-[var(--muted-foreground)]">
                {pick(COPY.storyBody, siteLocale)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={cn(isArabic && "text-right")}>
              <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="public-section-title">{pick(COPY.founderTitle, siteLocale)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className={cn("space-y-4", isArabic && "text-right")}>
              <p className="public-body-copy text-[var(--muted-foreground)]">
                {pick(COPY.founderBody, siteLocale)}
              </p>
              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-lg font-semibold leading-snug text-[var(--foreground)]">
                  {pick(COPY.founderListTitle, siteLocale)}
                </p>
                <ul
                  className={cn(
                    "public-body-copy mt-3 list-disc space-y-2 text-[var(--muted-foreground)]",
                    isArabic ? "pr-5 text-right" : "pl-5"
                  )}
                >
                  {founderList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="hero-backdrop">
          <CardHeader className={cn(isArabic && "text-right")}>
            <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <CheckCircle2 className="h-5 w-5" />
              </div>
                <CardTitle className="public-section-title">{pick(COPY.missionTitle, siteLocale)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className={cn(isArabic && "text-right")}>
              <p className="public-body-copy text-[var(--foreground)]">
                {pick(COPY.missionBody, siteLocale)}
              </p>
            </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {COPY.values.map((value) => (
            <Card key={value.title.en}>
              <CardHeader className={cn(isArabic && "text-right")}>
                <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse")}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <value.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="public-section-title">{pick(value.title, siteLocale)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className={cn(isArabic && "text-right")}>
                <p className="public-body-copy text-[var(--muted-foreground)]">
                  {pick(value.body, siteLocale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
            <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", isArabic && "sm:flex-row-reverse")}>
              <div className={cn("max-w-2xl", isArabic && "text-right")}>
                <h2 className="public-section-title font-bold text-[var(--foreground)]">
                  {pick(COPY.ctaTitle, siteLocale)}
                </h2>
                <p className="public-body-copy mt-3 text-[var(--muted-foreground)]">
                  {pick(COPY.ctaBody, siteLocale)}
                </p>
              </div>
              <Link
                href="/login?tab=signup"
                className="inline-flex h-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary)] px-6 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                {pick(COPY.ctaButton, siteLocale)}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
}
