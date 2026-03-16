"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  HandHeart,
  ImageIcon,
  LaptopMinimal,
  Rocket,
  Settings2,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import {
  FOUNDER_OFFER_ROUTE,
  FOUNDER_PLAN_SECTION_ID,
} from "@/components/founder-offer/content";
import { FaqAccordion } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { paymentsComingSoon, withPaymentComingSoonLabel } from "@/lib/payments-ui";
import { cn } from "@/lib/utils";

interface FounderSupportPageProps {
  isLoggedIn?: boolean;
}

interface SectionHeadingProps {
  eyebrow?: LocalizedCopy<string>;
  title: LocalizedCopy<string>;
  body?: LocalizedCopy<string>;
  centered?: boolean;
}

interface PhotoPlaceholderData {
  label: LocalizedCopy<string>;
  note: LocalizedCopy<string>;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

interface FundingArea {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: LocalizedCopy<string>;
  body: LocalizedCopy<readonly string[]>;
}

interface FaqItem {
  question: LocalizedCopy<string>;
  answer: LocalizedCopy<string>;
}

function listCopy(en: readonly string[], ar: readonly string[]): LocalizedCopy<readonly string[]> {
  return { en, ar };
}

const CTA_HREF = `${FOUNDER_OFFER_ROUTE}#${FOUNDER_PLAN_SECTION_ID}`;

const PAGE_CONTENT = {
  hero: {
    eyebrow: {
      en: "A note from the founder",
      ar: "ملاحظة من المؤسس",
    },
    title: {
      en: "Where your support goes",
      ar: "إلى أين يذهب دعمك",
    },
    subheadline: {
      en: "If you become a Founder Supporter, you're helping me build FAZUMI with better tools, stronger systems, and more room to do the work properly — with care, not shortcuts.",
      ar: "إذا أصبحت Founder Supporter، فأنت تساعدني على بناء FAZUMI بأدوات أفضل، وأنظمة أقوى، ومساحة أكبر للقيام بالعمل كما يجب — بعناية، لا بالاختصارات.",
    },
    body: listCopy(
      [
        "FAZUMI is still early, but I'm building it seriously and for the long term.",
        "This page is here because I think early supporters deserve honesty about what they're helping fund and why it matters.",
      ],
      [
        "FAZUMI لا يزال في بداياته، لكنني أبنيه بجدية وللمدى الطويل.",
        "هذه الصفحة موجودة لأنني أعتقد أن الداعمين الأوائل يستحقون الوضوح بشأن ما يساعدون في تمويله ولماذا يهم ذلك.",
      ]
    ),
    backCta: {
      en: "Back to Founder Supporter",
      ar: "العودة إلى Founder Supporter",
    },
    primaryCta: {
      en: "Become a Founder Supporter",
      ar: "كن Founder Supporter",
    },
    microcopy: {
      en: "A calm explanation, not a sales pitch.",
      ar: "شرح هادئ، لا خطاب بيع.",
    },
  },
  intro: {
    title: {
      en: "A simple promise",
      ar: "وعد بسيط",
    },
    body: listCopy(
      [
        "I want FAZUMI to become something genuinely useful for busy families — something that saves time, reduces stress, and makes school communication feel clearer.",
        "Founder Support helps me build that foundation properly.",
        "It gives me the ability to invest in the development setup, AI tools, internal systems, and product improvements that help FAZUMI move faster and get better over time.",
        "This is not about raising money for the sake of it. It's about using early support responsibly to build a stronger product.",
      ],
      [
        "أريد لـ FAZUMI أن يصبح شيئًا مفيدًا فعلًا للعائلات المشغولة — شيئًا يوفر الوقت، ويخفف الضغط، ويجعل تواصل المدرسة أوضح.",
        "Founder Support يساعدني على بناء هذه القاعدة بشكل صحيح.",
        "هو يمنحني القدرة على الاستثمار في بيئة التطوير، وأدوات الذكاء الاصطناعي، والأنظمة الداخلية، والتحسينات التي تساعد FAZUMI على أن يتحرك أسرع ويصبح أفضل مع الوقت.",
        "الأمر ليس جمع مال لمجرد جمعه. بل استخدام الدعم المبكر بمسؤولية لبناء منتج أقوى.",
      ]
    ),
  },
  fundingAreas: [
    {
      icon: LaptopMinimal,
      title: {
        en: "Better development tools",
        ar: "أدوات تطوير أفضل",
      },
      body: {
        en: [
          "Some of your support goes into the machines, setup, and working environment I use to build FAZUMI day to day.",
          "Better tools help me work faster, test more reliably, and build with fewer compromises. They also support the internal systems I use for development, admin work, and ongoing improvements behind the scenes.",
        ],
        ar: [
          "يذهب جزء من دعمك إلى الأجهزة، والتجهيزات، وبيئة العمل التي أستخدمها لبناء FAZUMI يومًا بعد يوم.",
          "الأدوات الأفضل تساعدني على العمل أسرع، والاختبار بثبات أكبر، والبناء مع تنازلات أقل. كما تدعم الأنظمة الداخلية التي أستخدمها للتطوير، والعمل الإداري، والتحسينات المستمرة خلف الكواليس.",
        ],
      },
    },
    {
      icon: Bot,
      title: {
        en: "Stronger AI tools and model access",
        ar: "أدوات ذكاء اصطناعي أقوى ووصول أفضل إلى النماذج",
      },
      body: {
        en: [
          "A meaningful part of Founder Support also goes into advanced AI tools.",
          "That includes premium subscriptions, model access, API usage, testing, and experimentation that help with development, research, support workflows, admin tasks, and marketing.",
          "In simple terms: better tools help me build a better product.",
        ],
        ar: [
          "جزء مهم من Founder Support يذهب أيضًا إلى أدوات ذكاء اصطناعي متقدمة.",
          "وهذا يشمل الاشتراكات المميزة، والوصول إلى النماذج، واستخدام الواجهات البرمجية، والاختبار، والتجربة التي تساعد في التطوير، والبحث، ومسارات الدعم، والمهام الإدارية، والتسويق.",
          "ببساطة: الأدوات الأفضل تساعدني على بناء منتج أفضل.",
        ],
      },
    },
    {
      icon: Settings2,
      title: {
        en: "Product refinement and operations",
        ar: "صقل المنتج والعمليات",
      },
      body: {
        en: [
          "Some of the most important work is the part users never fully see.",
          "Testing, improving workflows, refining the product, handling operations, and building better support systems all take time and resources. Founder Support helps create space for that work, so FAZUMI can become more reliable, more thoughtful, and more useful over time.",
        ],
        ar: [
          "بعض أهم العمل هو الجزء الذي لا يراه المستخدم كاملًا.",
          "الاختبار، وتحسين مسارات العمل، وصقل المنتج، وإدارة العمليات، وبناء أنظمة دعم أفضل كلها تحتاج إلى وقت وموارد. Founder Support يساعد على توفير مساحة لهذا العمل، حتى يصبح FAZUMI أكثر موثوقية، وأكثر تفكيرًا، وأكثر فائدة مع الوقت.",
        ],
      },
    },
    {
      icon: Rocket,
      title: {
        en: "Building for the long term",
        ar: "البناء على المدى الطويل",
      },
      body: {
        en: [
          "I'm not trying to rush FAZUMI out as a quick experiment.",
          "I want to build something sustainable — something that families can trust and keep using. Early support helps me make better long-term decisions, invest in the right setup, and keep improving the product with more care.",
        ],
        ar: [
          "أنا لا أحاول إخراج FAZUMI بسرعة على شكل تجربة عابرة.",
          "أريد أن أبني شيئًا مستدامًا — شيئًا يمكن للعائلات أن تثق به وتستمر في استخدامه. الدعم المبكر يساعدني على اتخاذ قرارات أفضل على المدى الطويل، والاستثمار في التجهيز الصحيح، ومواصلة تحسين المنتج بعناية أكبر.",
        ],
      },
    },
  ] satisfies readonly FundingArea[],
  practicalExamples: {
    title: {
      en: "In practice, this may include",
      ar: "عمليًا، قد يشمل ذلك",
    },
    items: listCopy(
      [
        "Development hardware used to build and run FAZUMI systems",
        "Premium AI subscriptions and model access",
        "API credits, testing, and experimentation",
        "Internal admin and support tooling",
        "Automation and product operations",
        "Product refinement, research, and launch preparation",
      ],
      [
        "أجهزة التطوير المستخدمة لبناء وتشغيل أنظمة FAZUMI",
        "اشتراكات ذكاء اصطناعي مميزة ووصول إلى النماذج",
        "رصيد واجهات برمجية، واختبار، وتجربة",
        "أدوات داخلية للإدارة والدعم",
        "الأتمتة وعمليات المنتج",
        "صقل المنتج، والبحث، والاستعداد للإطلاق",
      ]
    ),
    note: {
      en: "I prefer to keep this practical rather than overly technical, but the goal is simple: use support in ways that directly improve FAZUMI and my ability to build it well.",
      ar: "أفضل أن أبقي هذا عمليًا بدلًا من أن يكون تقنيًا أكثر من اللازم، لكن الهدف بسيط: استخدام الدعم بطرق تحسن FAZUMI مباشرة وتحسن قدرتي على بنائه جيدًا.",
    },
  },
  personalNote: {
    title: {
      en: "Why I'm sharing this",
      ar: "لماذا أشارك هذا",
    },
    body: listCopy(
      [
        "Because I think people who support early should know what they're supporting.",
        "Founder Support is not a charity donation. It's a way to help fund the early build phase of FAZUMI in a real, practical way.",
        "You're helping me invest in the tools, systems, and working capacity needed to build FAZUMI properly — not just as a quick idea, but as something genuinely useful and worth trusting.",
      ],
      [
        "لأنني أعتقد أن من يدعم مبكرًا يجب أن يعرف ماذا يدعم.",
        "Founder Support ليس تبرعًا خيريًا. بل هو طريقة للمساعدة في تمويل المرحلة المبكرة من بناء FAZUMI بشكل عملي وحقيقي.",
        "أنت تساعدني على الاستثمار في الأدوات، والأنظمة، والطاقة العملية اللازمة لبناء FAZUMI كما ينبغي — ليس كفكرة سريعة، بل كشيء مفيد فعلًا ويستحق الثقة.",
      ]
    ),
    quote: {
      en: "\"I want to build FAZUMI properly from the beginning — useful, calm, reliable, and worth supporting early.\"",
      ar: "\"أريد أن أبني FAZUMI بشكل صحيح من البداية — مفيدًا، وهادئًا، وموثوقًا، ويستحق الدعم المبكر.\"",
    },
  },
  faqTitle: {
    en: "A few honest questions",
    ar: "بعض الأسئلة الصادقة",
  },
  faq: [
    {
      question: {
        en: "Is this a donation?",
        ar: "هل هذا تبرع؟",
      },
      answer: {
        en: "Not exactly. Founder Support is a paid early-support plan for people who want to back FAZUMI at an early stage and help strengthen the build behind it.",
        ar: "ليس تمامًا. Founder Support هو خطة دعم مبكر مدفوعة لمن يريد دعم FAZUMI في مرحلة مبكرة والمساعدة في تقوية البناء الذي يقف خلفه.",
      },
    },
    {
      question: {
        en: "Are you sharing exact expenses publicly?",
        ar: "هل تشارك المصروفات الدقيقة بشكل علني؟",
      },
      answer: {
        en: "Not as a public line-by-line budget. I prefer to be transparent in a practical way: support helps fund development tools, AI systems, product improvements, and the infrastructure needed to build FAZUMI well.",
        ar: "ليس على شكل ميزانية علنية بندًا بندًا. أفضل الشفافية العملية: الدعم يساعد في تمويل أدوات التطوير، وأنظمة الذكاء الاصطناعي، وتحسينات المنتج، والبنية اللازمة لبناء FAZUMI بشكل جيد.",
      },
    },
    {
      question: {
        en: "Does support only go into software?",
        ar: "هل يذهب الدعم إلى البرمجيات فقط؟",
      },
      answer: {
        en: "No. It can also go into the broader setup needed to build effectively — including development hardware, internal systems, testing, and better working capacity.",
        ar: "لا. يمكن أن يذهب أيضًا إلى التجهيز الأوسع اللازم للبناء بفعالية — بما في ذلك أجهزة التطوير، والأنظمة الداخلية، والاختبار، وطاقة عمل أفضل.",
      },
    },
    {
      question: {
        en: "Why mention this at all?",
        ar: "لماذا ذكر هذا أصلًا؟",
      },
      answer: {
        en: "Because I think early supporters deserve honesty. If someone is backing FAZUMI early, I want them to understand how that support helps move the product forward.",
        ar: "لأنني أعتقد أن الداعمين الأوائل يستحقون الصراحة. إذا كان شخص ما يدعم FAZUMI مبكرًا، فأريد أن يفهم كيف يساعد هذا الدعم في دفع المنتج إلى الأمام.",
      },
    },
    {
      question: {
        en: "Will Founder Support actually make FAZUMI better?",
        ar: "هل سيجعل Founder Support FAZUMI أفضل فعلًا؟",
      },
      answer: {
        en: "Yes — that's the whole point. Better tools, better systems, and more room for focused work all help improve speed, quality, and consistency.",
        ar: "نعم — وهذا هو الهدف كله. الأدوات الأفضل، والأنظمة الأفضل، والمساحة الأكبر للعمل المركّز كلها تساعد على تحسين السرعة، والجودة، والثبات.",
      },
    },
    {
      question: {
        en: "Can someone support in another way?",
        ar: "هل يمكن لشخص ما أن يدعم بطريقة أخرى؟",
      },
      answer: {
        en: "Yes. Some people may prefer to help through introductions, partnerships, tools, or other useful support. Founder Support is one path, not the only one.",
        ar: "نعم. قد يفضل بعض الناس المساعدة عبر التعارف، أو الشراكات، أو الأدوات، أو أي دعم مفيد آخر. Founder Support طريق واحد، وليس الطريق الوحيد.",
      },
    },
  ] satisfies readonly FaqItem[],
  finalCta: {
    title: {
      en: "Thanks for helping build FAZUMI early",
      ar: "شكرًا لمساعدتك في بناء FAZUMI مبكرًا",
    },
    body: {
      en: "If you choose to support FAZUMI at this stage, thank you. It genuinely helps me build with better tools, better systems, and more care.",
      ar: "إذا اخترت دعم FAZUMI في هذه المرحلة، فشكرًا لك. هذا يساعدني فعلًا على البناء بأدوات أفضل، وأنظمة أفضل، وعناية أكبر.",
    },
    backCta: {
      en: "Back to Founder Supporter",
      ar: "العودة إلى Founder Supporter",
    },
    primaryCta: {
      en: "Become a Founder Supporter",
      ar: "كن Founder Supporter",
    },
    reassurance: {
      en: "No pressure — this page is simply here for transparency.",
      ar: "لا يوجد أي ضغط — هذه الصفحة موجودة فقط من باب الشفافية.",
    },
  },
  placeholders: {
    hero: {
      label: {
        en: "Founder portrait",
        ar: "صورة المؤسس",
      },
      note: {
        en: "A warm founder portrait with soft light and a calm expression.",
        ar: "صورة هادئة للمؤسس بإضاءة ناعمة وتعبير مريح.",
      },
      icon: HandHeart,
    },
    intro: {
      label: {
        en: "Calm workspace photo",
        ar: "صورة مساحة عمل هادئة",
      },
      note: {
        en: "Desk, notebook, coffee, and a quiet phone-on-table moment.",
        ar: "مكتب، ومفكرة، وقهوة، ولحظة هادئة مع الهاتف على الطاولة.",
      },
      icon: BriefcaseBusiness,
    },
    practical: {
      label: {
        en: "Tools / build setup photo",
        ar: "صورة الأدوات وتجهيزات البناء",
      },
      note: {
        en: "Laptop, testing setup, and the kind of tools behind a careful product build.",
        ar: "لابتوب، وتجهيز للاختبار، ونوع الأدوات التي تقف خلف بناء منتج بعناية.",
      },
      icon: Wrench,
    },
    note: {
      label: {
        en: "Founder note portrait",
        ar: "صورة ملاحظة المؤسس",
      },
      note: {
        en: "A quieter, more personal portrait for the closing note.",
        ar: "صورة أكثر هدوءًا وشخصية لملاحظة الختام.",
      },
      icon: Sparkles,
    },
  } satisfies Record<string, PhotoPlaceholderData>,
} as const;

function SectionHeading({ eyebrow, title, body, centered = false }: SectionHeadingProps) {
  const { locale } = useLang();

  return (
    <div className={cn("max-w-3xl space-y-3", centered && "mx-auto text-center")}>
      {eyebrow ? <p className="eyebrow text-[var(--primary)]">{pick(eyebrow, locale)}</p> : null}
      <h2 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
        {pick(title, locale)}
      </h2>
      {body ? (
        <p className="text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
          {pick(body, locale)}
        </p>
      ) : null}
    </div>
  );
}

function ActionLink({
  href,
  label,
  variant = "outline",
  icon: Icon,
}: {
  href: string;
  label: string;
  variant?: "default" | "outline";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  const { locale } = useLang();
  const isArabic = locale === "ar";

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant, size: "lg" }),
        "min-h-12 w-full rounded-full px-6 text-sm sm:w-auto sm:text-base",
        isArabic && "flex-row-reverse"
      )}
    >
      <span>{label}</span>
      <Icon className="h-4 w-4 shrink-0" />
    </Link>
  );
}

function PhotoPlaceholder({
  placeholder,
  className,
}: {
  placeholder: PhotoPlaceholderData;
  className?: string;
}) {
  const { locale } = useLang();
  const Icon = placeholder.icon;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(236,244,238,0.94))] p-5 shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(36,112,82,0.12),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(229,161,92,0.12),transparent_32%)]" />
      <div className="relative flex h-full min-h-[18rem] flex-col justify-between gap-6">
        <span className="inline-flex w-fit items-center rounded-full border border-[var(--border)] bg-[var(--glass-surface)] px-3 py-1 text-[var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {locale === "ar" ? "عنصر صورة مؤقت" : "Photo placeholder"}
        </span>

        <div className="space-y-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary)] shadow-[var(--shadow-xs)]">
            <Icon className="h-6 w-6" />
          </span>
          <div className="space-y-2">
            <p className="text-[var(--text-lg)] font-semibold text-[var(--text-strong)]">
              {pick(placeholder.label, locale)}
            </p>
            <p className="max-w-sm text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
              {pick(placeholder.note, locale)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[var(--text-xs)] text-[var(--muted-foreground)]">
          <ImageIcon className="h-4 w-4" />
          <span>{locale === "ar" ? "استبدل هذا بصورة حقيقية لاحقًا" : "Replace with a real photo later"}</span>
        </div>
      </div>
    </div>
  );
}

export function FounderSupportPage({ isLoggedIn = false }: FounderSupportPageProps) {
  const { locale } = useLang();
  const isArabic = locale === "ar";
  const heroPrimaryLabel = paymentsComingSoon
    ? withPaymentComingSoonLabel(pick(PAGE_CONTENT.hero.primaryCta, locale), locale)
    : pick(PAGE_CONTENT.hero.primaryCta, locale);
  const finalPrimaryLabel = paymentsComingSoon
    ? withPaymentComingSoonLabel(pick(PAGE_CONTENT.finalCta.primaryCta, locale), locale)
    : pick(PAGE_CONTENT.finalCta.primaryCta, locale);

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      lang={locale}
      className={cn("min-h-screen bg-[var(--background)] pb-16", isArabic && "font-arabic")}
    >
      <Nav isLoggedIn={isLoggedIn} />

      <main>
        <section className="page-section-tight pt-8 sm:pt-10">
          <div className="page-shell">
            <div className="hero-backdrop surface-panel-elevated overflow-hidden px-6 py-7 sm:px-8 sm:py-9">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)] lg:items-center">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="eyebrow text-[var(--primary)]">
                      {pick(PAGE_CONTENT.hero.eyebrow, locale)}
                    </p>
                    <h1 className="max-w-4xl text-[var(--text-4xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-5xl)]">
                      {pick(PAGE_CONTENT.hero.title, locale)}
                    </h1>
                    <p className="max-w-3xl text-[var(--text-lg)] leading-relaxed text-[var(--muted-foreground)]">
                      {pick(PAGE_CONTENT.hero.subheadline, locale)}
                    </p>
                  </div>

                  <div className="max-w-2xl space-y-3">
                    {pick(PAGE_CONTENT.hero.body, locale).map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-[var(--text-base)] leading-relaxed text-[var(--foreground)]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <ActionLink
                      href={FOUNDER_OFFER_ROUTE}
                      label={pick(PAGE_CONTENT.hero.backCta, locale)}
                      variant="outline"
                      icon={ArrowLeft}
                    />
                    <ActionLink
                      href={CTA_HREF}
                      label={heroPrimaryLabel}
                      variant="default"
                      icon={ArrowUpRight}
                    />
                  </div>

                  <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                    {pick(PAGE_CONTENT.hero.microcopy, locale)}
                  </p>
                </div>

                <FounderPhoto src="/images/founder-support/founder-support-photo-1.png" className="aspect-square" />
              </div>
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="page-shell grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)] lg:items-center">
            <div className="space-y-5 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)] sm:px-7">
              <SectionHeading title={PAGE_CONTENT.intro.title} />
              <div className="space-y-4">
                {pick(PAGE_CONTENT.intro.body, locale).map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-[var(--text-base)] leading-relaxed text-[var(--foreground)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <FounderPhoto src="/images/founder-support/founder-support-photo-2.png" className="aspect-[3/2]" />
          </div>
        </section>

        <section className="page-section bg-[var(--page-layer)]">
          <div className="page-shell space-y-8">
            <SectionHeading
              title={{
                en: "What your support helps fund",
                ar: "ما الذي يساعد دعمك على تمويله",
              }}
              centered
            />

            <div className="grid gap-4 md:grid-cols-2">
              {PAGE_CONTENT.fundingAreas.map((area) => {
                const Icon = area.icon;

                return (
                  <article
                    key={area.title.en}
                    className="group rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-5 shadow-[var(--shadow-card)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] sm:px-6"
                  >
                    <div className="flex items-start gap-4">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="space-y-3">
                        <h3 className="text-[var(--text-xl)] font-semibold text-[var(--text-strong)]">
                          {pick(area.title, locale)}
                        </h3>
                        <div className="space-y-3">
                          {pick(area.body, locale).map((paragraph) => (
                            <p
                              key={paragraph}
                              className="text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]"
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="page-shell grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)] lg:items-start">
            <div className="space-y-8">
              <SectionHeading title={PAGE_CONTENT.practicalExamples.title} />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pick(PAGE_CONTENT.practicalExamples.items, locale).map((item) => (
                  <div
                    key={item}
                    className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-5 py-5 shadow-[var(--shadow-xs)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <p className="text-[var(--text-sm)] leading-relaxed text-[var(--foreground)]">
                        {item}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="max-w-3xl text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                {pick(PAGE_CONTENT.practicalExamples.note, locale)}
              </p>
            </div>

            <PhotoPlaceholder placeholder={PAGE_CONTENT.placeholders.practical} className="min-h-[22rem] lg:sticky lg:top-24" />
          </div>
        </section>

        <section className="page-section bg-[var(--page-layer-alt)]">
          <div className="page-shell grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.82fr)] lg:items-center">
            <div className="space-y-5">
              <SectionHeading title={PAGE_CONTENT.personalNote.title} />

              <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)]">
                <div className="space-y-4">
                  {pick(PAGE_CONTENT.personalNote.body, locale).map((paragraph) => (
                    <p
                      key={paragraph}
                      className="text-[var(--text-base)] leading-relaxed text-[var(--foreground)]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                <blockquote className="mt-6 rounded-[var(--radius-lg)] border border-[var(--primary)]/15 bg-[var(--primary-soft)] px-5 py-5 text-[var(--text-base)] leading-relaxed text-[var(--text-strong)]">
                  {pick(PAGE_CONTENT.personalNote.quote, locale)}
                </blockquote>
              </div>
            </div>

            <FounderPhoto src="/images/founder-support/founder-support-photo-4.png" className="aspect-[2/3]" />
          </div>
        </section>

        <section className="page-section">
          <div className="page-shell">
            <div className="surface-panel-elevated px-6 py-7 sm:px-8">
              <SectionHeading title={PAGE_CONTENT.faqTitle} centered />

              <FaqAccordion
                items={PAGE_CONTENT.faq.map((item) => ({
                  question: pick(item.question, locale),
                  answer: pick(item.answer, locale),
                }))}
                defaultOpenFirst
                className="mt-8"
                buttonClassName="min-h-14 py-5 text-[var(--text-base)] font-semibold"
                answerClassName="max-w-3xl text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]"
              />
            </div>
          </div>
        </section>

        <section className="page-section pt-0">
          <div className="page-shell">
            <div className="hero-backdrop surface-panel-elevated overflow-hidden px-6 py-8 text-center sm:px-8 sm:py-10">
              <div className="mx-auto max-w-3xl space-y-5">
                <h2 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
                  {pick(PAGE_CONTENT.finalCta.title, locale)}
                </h2>
                <p className="text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                  {pick(PAGE_CONTENT.finalCta.body, locale)}
                </p>

                <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row sm:flex-wrap">
                  <ActionLink
                    href={FOUNDER_OFFER_ROUTE}
                    label={pick(PAGE_CONTENT.finalCta.backCta, locale)}
                    variant="outline"
                    icon={ArrowLeft}
                  />
                  <ActionLink
                    href={CTA_HREF}
                    label={finalPrimaryLabel}
                    variant="default"
                    icon={ArrowUpRight}
                  />
                </div>

                <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                  {pick(PAGE_CONTENT.finalCta.reassurance, locale)}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
