import { lsVariantIds } from "@/lib/config/public";
import type { LocalizedCopy } from "@/lib/i18n";

export const FOUNDER_OFFER_ROUTE = "/founder-supporter";
export const FOUNDER_SUPPORT_ROUTE = "/founder-support";
export const FOUNDER_OFFER_PRICE = 149;
export const FOUNDER_OFFER_LIMIT = 350;
export const FOUNDER_OFFER_CHECKOUT_VARIANT = lsVariantIds.founder ?? "";
export const FOUNDER_HOW_IT_WORKS_ID = "how-it-works";
export const FOUNDER_PLAN_SECTION_ID = "founder-plan";

type LocalizedItem = {
  title: LocalizedCopy<string>;
  body: LocalizedCopy<string>;
};

type FaqItem = {
  question: LocalizedCopy<string>;
  answer: LocalizedCopy<string>;
};

export const founderOfferContent = {
  hero: {
    headline: {
      en: "Turn school WhatsApp chaos into clear next steps.",
      ar: "حوّل فوضى رسائل المدرسة على واتساب إلى خطوات واضحة.",
    },
    body: {
      en: "FAZUMI helps busy parents turn long, messy school messages into a simple summary, tasks, dates, and payments in seconds. Join as one of only 350 Founder Supporters and get early access, premium perks, and a chance to help shape FAZUMI from the start.",
      ar: "يساعد FAZUMI الآباء المشغولين على تحويل رسائل المدرسة الطويلة والمبعثرة إلى ملخص بسيط، ومهام، ومواعيد، ومدفوعات خلال ثوانٍ. انضم كواحد من 350 من Founder Supporters فقط لتحصل على وصول مبكر، ومزايا مميزة، وفرصة للمساعدة في تشكيل FAZUMI من البداية.",
    },
    primaryCta: {
      en: "Become a Founder Supporter — $149",
      ar: "كن Founder Supporter — $149",
    },
    secondaryCta: {
      en: "See how FAZUMI works",
      ar: "شاهد كيف يعمل FAZUMI",
    },
    badges: [
      {
        en: "Limited to 350",
        ar: "محدود بـ 350 فقط",
      },
      {
        en: "One-time payment",
        ar: "دفعة واحدة",
      },
      {
        en: "Built for GCC parents",
        ar: "مصمم لآباء الخليج",
      },
    ],
    microcopy: [
      {
        en: "One-time payment",
        ar: "دفعة واحدة",
      },
      {
        en: "Limited to 350 spots",
        ar: "محدود بـ 350 مقعدًا",
      },
      {
        en: "Built for busy families in the GCC",
        ar: "مصمم للعائلات المشغولة في الخليج",
      },
      {
        en: "Founder-only perks included",
        ar: "يشمل مزايا خاصة بالداعمين الأوائل",
      },
    ],
    previewTitle: {
      en: "What founder supporters unlock",
      ar: "ما الذي يفتحه Founder Supporters",
    },
    previewLead: {
      en: "A calmer way to handle school communication, with early supporter access from day one.",
      ar: "طريقة أهدأ للتعامل مع تواصل المدرسة، مع وصول مبكر منذ اليوم الأول.",
    },
    previewSections: [
      {
        label: {
          en: "Summary",
          ar: "الملخص",
        },
        value: {
          en: "One clean overview instead of a long scroll.",
          ar: "نظرة واضحة بدل تمرير طويل داخل الرسائل.",
        },
      },
      {
        label: {
          en: "Tasks",
          ar: "المهام",
        },
        value: {
          en: "Know what needs action before it is late.",
          ar: "اعرف ما يحتاج إلى إجراء قبل فوات الأوان.",
        },
      },
      {
        label: {
          en: "Dates",
          ar: "المواعيد",
        },
        value: {
          en: "Keep deadlines, tests, and events visible.",
          ar: "اجعل المواعيد والاختبارات والفعاليات واضحة أمامك.",
        },
      },
      {
        label: {
          en: "Payments",
          ar: "المدفوعات",
        },
        value: {
          en: "Spot fees and payment reminders faster.",
          ar: "لاحظ الرسوم والتنبيهات المالية بسرعة أكبر.",
        },
      },
    ],
  },
  problem: {
    title: {
      en: "School messages should not feel like a second full-time job.",
      ar: "رسائل المدرسة لا يفترض أن تبدو كوظيفة ثانية بدوام كامل.",
    },
    body: {
      en: "Parents receive long school messages filled with homework, deadlines, payments, events, reminders, forms, and last-minute changes. The problem is not getting the messages. The problem is finding the important parts before it is too late.",
      ar: "يتلقى الآباء رسائل مدرسية طويلة مليئة بالواجبات، والمواعيد النهائية، والمدفوعات، والفعاليات، والتنبيهات، والنماذج، والتغييرات في آخر لحظة. المشكلة ليست في وصول الرسائل. المشكلة في العثور على الأهم قبل فوات الوقت.",
    },
    list: [
      { en: "Homework", ar: "الواجبات" },
      { en: "Deadlines", ar: "المواعيد النهائية" },
      { en: "Payments", ar: "المدفوعات" },
      { en: "Events", ar: "الفعاليات" },
      { en: "Reminders", ar: "التنبيهات" },
      { en: "Forms", ar: "النماذج" },
      { en: "Last-minute changes", ar: "التغييرات المفاجئة" },
    ],
    emotionalLine: {
      en: "FAZUMI gives parents clarity, calm, and control.",
      ar: "يمنح FAZUMI الآباء وضوحًا وهدوءًا وتحكمًا أكبر.",
    },
  },
  howItWorks: {
    title: {
      en: "Paste the message. Get the important parts instantly.",
      ar: "الصق الرسالة. واحصل على الأهم فورًا.",
    },
    supportLine: {
      en: "Less scrolling. Less guessing. Less stress.",
      ar: "تمرير أقل. تخمين أقل. توتر أقل.",
    },
    steps: [
      {
        title: {
          en: "Copy the school message",
          ar: "انسخ رسالة المدرسة",
        },
        body: {
          en: "Take the long WhatsApp update exactly as it arrived.",
          ar: "خذ تحديث واتساب الطويل كما وصل تمامًا.",
        },
      },
      {
        title: {
          en: "Paste it into FAZUMI",
          ar: "الصقها داخل FAZUMI",
        },
        body: {
          en: "Drop the message into a simple paste-first workflow.",
          ar: "ضع الرسالة في تجربة بسيطة تبدأ باللصق أولاً.",
        },
      },
      {
        title: {
          en: "Get a clean result",
          ar: "احصل على نتيجة واضحة",
        },
        body: {
          en: "See the summary, tasks, dates, payment reminders, and important notes in one place.",
          ar: "شاهد الملخص، والمهام، والمواعيد، وتذكيرات الدفع، والملاحظات المهمة في مكان واحد.",
        },
      },
    ],
    outputs: [
      { en: "Short summary", ar: "ملخص قصير" },
      { en: "Action items", ar: "عناصر تحتاج إلى إجراء" },
      { en: "Dates and deadlines", ar: "مواعيد ومهلات" },
      { en: "Payment reminders", ar: "تذكيرات بالدفع" },
      { en: "Important notes", ar: "ملاحظات مهمة" },
    ],
  },
  beforeAfter: {
    title: {
      en: "From messy chat to clear action",
      ar: "من دردشة مربكة إلى إجراء واضح",
    },
    summaryLabel: {
      en: "Summary",
      ar: "الملخص",
    },
    tasksLabel: {
      en: "Tasks",
      ar: "المهام",
    },
    datesLabel: {
      en: "Important dates",
      ar: "المواعيد المهمة",
    },
    rawLabel: {
      en: "Sample school message",
      ar: "رسالة مدرسية نموذجية",
    },
    rawMessage:
      "Dear parents, please be informed that students in Grade 5 must submit the science project by Thursday. Also, the trip payment of 75 QAR should be paid no later than Tuesday. Students must wear sports uniform on Wednesday for rehearsal. Kindly sign and return the attached consent form. Reminder that the Arabic test has been moved to Monday.",
    resultLabel: {
      en: "FAZUMI result",
      ar: "نتيجة FAZUMI",
    },
    resultSummary: {
      en: "Science project due this week. Trip payment required. Sports uniform needed Wednesday. Consent form must be signed. Arabic test moved to Monday.",
      ar: "مشروع العلوم مطلوب هذا الأسبوع. هناك رسوم رحلة مطلوبة. الزي الرياضي مطلوب يوم الأربعاء. يجب توقيع نموذج الموافقة. اختبار العربية نُقل إلى يوم الاثنين.",
    },
    tasks: [
      {
        en: "Pay 75 QAR trip fee by Tuesday",
        ar: "ادفع رسوم الرحلة 75 QAR قبل الثلاثاء",
      },
      {
        en: "Submit science project by Thursday",
        ar: "سلّم مشروع العلوم قبل الخميس",
      },
      {
        en: "Sign and return consent form",
        ar: "وقّع نموذج الموافقة وأعده",
      },
      {
        en: "Prepare sports uniform for Wednesday",
        ar: "جهّز الزي الرياضي ليوم الأربعاء",
      },
    ],
    dates: [
      {
        en: "Monday: Arabic test",
        ar: "الاثنين: اختبار العربية",
      },
      {
        en: "Tuesday: payment deadline",
        ar: "الثلاثاء: آخر موعد للدفع",
      },
      {
        en: "Wednesday: sports uniform",
        ar: "الأربعاء: الزي الرياضي",
      },
      {
        en: "Thursday: science project due",
        ar: "الخميس: موعد تسليم مشروع العلوم",
      },
    ],
    cta: {
      en: "Get Founder Access for $149",
      ar: "احصل على Founder Access مقابل $149",
    },
  },
  plan: {
    title: {
      en: "Become a FAZUMI Founder Supporter",
      ar: "كن FAZUMI Founder Supporter",
    },
    eyebrow: {
      en: "Founder offer",
      ar: "عرض المؤسسين",
    },
    shortTitle: {
      en: "Founder Supporter",
      ar: "الداعم المؤسس",
    },
    intro: {
      en: "This is not a donation. This is a limited early-supporter membership for parents who want premium value, early access, and a direct voice in what FAZUMI becomes.",
      ar: "هذا ليس تبرعًا. هذه عضوية محدودة للداعمين الأوائل للآباء الذين يريدون قيمة مميزة، ووصولًا مبكرًا، وصوتًا مباشرًا في ما سيصبح عليه FAZUMI.",
    },
    cardTitle: {
      en: "Founder Supporter — $149",
      ar: "Founder Supporter — $149",
    },
    cardSubtext: {
      en: "One-time payment",
      ar: "دفعة واحدة",
    },
    includes: [
      {
        en: "12 months of FAZUMI premium access",
        ar: "12 شهرًا من وصول FAZUMI المميز",
      },
      {
        en: "Founder Supporter badge",
        ar: "شارة Founder Supporter",
      },
      {
        en: "Priority support",
        ar: "دعم ذو أولوية",
      },
      {
        en: "Early access to new features",
        ar: "وصول مبكر إلى الميزات الجديدة",
      },
      {
        en: "Direct feedback channel with the founder",
        ar: "قناة مباشرة لإرسال الملاحظات إلى المؤسس",
      },
      {
        en: "Founder-only updates and behind-the-scenes progress",
        ar: "تحديثات خاصة بالداعمين الأوائل ولمحات من وراء الكواليس",
      },
      {
        en: "Opportunity to help shape future features",
        ar: "فرصة للمساعدة في تشكيل الميزات القادمة",
      },
      {
        en: "Locked early supporter value before public pricing evolves",
        ar: "قيمة داعم مبكر محفوظة قبل تطور التسعير العام",
      },
    ],
    scarcityLine: {
      en: "Only 350 Founder Supporter spots will ever be available.",
      ar: "لن يتوفر أكثر من 350 مقعدًا لـ Founder Supporter على الإطلاق.",
    },
    cta: {
      en: "Claim My Founder Spot",
      ar: "احجز مقعدي كمؤسس داعم",
    },
    trustNotes: [
      {
        en: "Secure checkout",
        ar: "دفع آمن",
      },
      {
        en: "No recurring payment",
        ar: "من دون رسوم متكررة",
      },
      {
        en: "Clear founder-only perks",
        ar: "مزايا واضحة خاصة بالداعمين الأوائل",
      },
    ],
  },
  whyJoinNow: {
    title: {
      en: "Why become a Founder Supporter now?",
      ar: "لماذا تنضم كـ Founder Supporter الآن؟",
    },
    cards: [
      {
        title: {
          en: "Get premium value early",
          ar: "احصل على قيمة مميزة مبكرًا",
        },
        body: {
          en: "Join before the offer changes and keep the early-supporter advantage.",
          ar: "انضم قبل تغيّر العرض واحتفظ بميزة الداعم المبكر.",
        },
      },
      {
        title: {
          en: "Help shape the product",
          ar: "ساعد في تشكيل المنتج",
        },
        body: {
          en: "Your feedback can directly influence which founder-worthy features ship next.",
          ar: "ملاحظاتك يمكن أن تؤثر مباشرة في الميزات التي تستحقها العائلات بعد ذلك.",
        },
      },
      {
        title: {
          en: "Save time every week",
          ar: "وفّر وقتًا كل أسبوع",
        },
        body: {
          en: "School admin does not slow down. Clear summaries make it easier to stay on top of it.",
          ar: "الأعباء المدرسية لا تتوقف. الملخصات الواضحة تجعل المتابعة أسهل بكثير.",
        },
      },
      {
        title: {
          en: "Be part of the first 350",
          ar: "كن ضمن أول 350",
        },
        body: {
          en: "A smaller early group means more attention, closer feedback, and founder-only context.",
          ar: "المجموعة المبكرة الأصغر تعني اهتمامًا أكبر، وتواصلاً أقرب، وسياقًا خاصًا بالداعمين.",
        },
      },
    ] satisfies LocalizedItem[],
  },
  gcc: {
    title: {
      en: "Built with the reality of GCC family life in mind",
      ar: "مبني على واقع الحياة العائلية في الخليج",
    },
    points: [
      {
        en: "Heavy reliance on WhatsApp",
        ar: "اعتماد كبير على واتساب",
      },
      {
        en: "Busy family routines",
        ar: "روتين عائلي مزدحم",
      },
      {
        en: "Bilingual communication in many homes",
        ar: "تواصل ثنائي اللغة في كثير من البيوت",
      },
      {
        en: "Lots of reminders and admin messages",
        ar: "كثرة التنبيهات والرسائل الإدارية",
      },
      {
        en: "Pressure not to miss important school details",
        ar: "ضغط مستمر حتى لا يفوتك أي تفصيل مدرسي مهم",
      },
    ],
    closing: {
      en: "This is not a generic productivity app. FAZUMI is being built for real parents dealing with real school-message overload.",
      ar: "هذا ليس تطبيق إنتاجية عامًا. يتم بناء FAZUMI لآباء حقيقيين يتعاملون مع ضغط رسائل المدرسة اليومي.",
    },
  },
  trust: {
    title: {
      en: "Built to be simple, useful, and trustworthy",
      ar: "مبني ليكون بسيطًا، وعمليًا، وجديرًا بالثقة",
    },
    body: {
      en: "When it comes to school information, trust matters. FAZUMI is being built with a focus on clarity, privacy, and practical usefulness.",
      ar: "عندما يتعلق الأمر بمعلومات المدرسة، فالثقة مهمة. يتم بناء FAZUMI مع تركيز واضح على الوضوح، والخصوصية، والفائدة العملية.",
    },
    bullets: [
      {
        en: "Clear product promise",
        ar: "وعد منتج واضح",
      },
      {
        en: "Transparent founder offer",
        ar: "عرض مؤسس واضح وشفاف",
      },
      {
        en: "Secure checkout",
        ar: "دفع آمن",
      },
      {
        en: "Straightforward support",
        ar: "دعم مباشر وواضح",
      },
      {
        en: "Designed for everyday parent use",
        ar: "مصمم للاستخدام اليومي من قبل الآباء",
      },
    ],
    founderNote: {
      en: "Built by a founder who understands the daily reality of school communication and wants to make it easier for families.",
      ar: "بني على يد مؤسس يفهم واقع التواصل المدرسي اليومي ويريد أن يجعله أسهل للعائلات.",
    },
    founderNoteLabel: {
      en: "Founder note",
      ar: "ملاحظة من المؤسس",
    },
    transparencyTitle: {
      en: "Want a calmer note on where Founder Support goes?",
      ar: "هل تريد ملاحظة أوضح عن أين يذهب Founder Support؟",
    },
    transparencyBody: {
      en: "I've shared a simple page about how early support helps fund the tools, systems, and working capacity behind FAZUMI.",
      ar: "شاركت صفحة بسيطة تشرح كيف يساعد الدعم المبكر في تمويل الأدوات والأنظمة والطاقة العملية التي تقف خلف FAZUMI.",
    },
    transparencyCta: {
      en: "Read where your support goes",
      ar: "اقرأ أين يذهب دعمك",
    },
  },
  faqTitle: {
    en: "Questions parents may ask before joining",
    ar: "أسئلة قد يطرحها الآباء قبل الانضمام",
  },
  faq: [
    {
      question: {
        en: "What is the FAZUMI Founder Supporter plan?",
        ar: "ما هي خطة FAZUMI Founder Supporter؟",
      },
      answer: {
        en: "It is a limited early-supporter membership for parents who want early access, premium perks, and a closer feedback relationship with FAZUMI as it grows.",
        ar: "هي عضوية محدودة للداعمين الأوائل للآباء الذين يريدون وصولًا مبكرًا، ومزايا مميزة، وعلاقة ملاحظات أقرب مع FAZUMI أثناء نموه.",
      },
    },
    {
      question: {
        en: "Is this an investment?",
        ar: "هل هذا استثمار؟",
      },
      answer: {
        en: "No. This is not an investment. It is a one-time Founder Supporter membership focused on product access, founder-only perks, and early supporter participation.",
        ar: "لا. هذا ليس استثمارًا. إنها عضوية Founder Supporter بدفعة واحدة تركّز على الوصول إلى المنتج، والمزايا الخاصة بالداعمين الأوائل، والمشاركة المبكرة.",
      },
    },
    {
      question: {
        en: "What do I get for $149?",
        ar: "ماذا أحصل عليه مقابل $149؟",
      },
      answer: {
        en: "You get 12 months of premium access, a Founder Supporter badge, priority support, early access to new features, founder-only updates, and a direct path to share feedback.",
        ar: "تحصل على 12 شهرًا من الوصول المميز، وشارة Founder Supporter، ودعم ذي أولوية، ووصول مبكر إلى الميزات الجديدة، وتحديثات خاصة بالداعمين الأوائل، وطريق مباشر لمشاركة الملاحظات.",
      },
    },
    {
      question: {
        en: "Why is the number limited to 350?",
        ar: "لماذا العدد محدود بـ 350؟",
      },
      answer: {
        en: "Because the goal is a focused early group. A smaller founder circle makes it easier to support supporters well and learn from them properly.",
        ar: "لأن الهدف هو تكوين مجموعة مبكرة مركزة. الدائرة الأصغر تجعل دعم الداعمين أسهل وتعلّم احتياجاتهم بشكل أفضل.",
      },
    },
    {
      question: {
        en: "Who is FAZUMI for?",
        ar: "لمن صُمم FAZUMI؟",
      },
      answer: {
        en: "FAZUMI is for busy parents who deal with long school WhatsApp messages and want a faster way to find tasks, dates, fees, and important reminders.",
        ar: "صُمم FAZUMI للآباء المشغولين الذين يتعاملون مع رسائل المدرسة الطويلة على واتساب ويريدون طريقة أسرع لاكتشاف المهام والمواعيد والرسوم والتنبيهات المهمة.",
      },
    },
    {
      question: {
        en: "Do I need technical skills to use FAZUMI?",
        ar: "هل أحتاج إلى مهارات تقنية لاستخدام FAZUMI؟",
      },
      answer: {
        en: "No. The workflow is simple: copy the message, paste it, and read the organized result.",
        ar: "لا. التجربة بسيطة: انسخ الرسالة، الصقها، ثم اقرأ النتيجة المنظمة.",
      },
    },
    {
      question: {
        en: "Will FAZUMI work only in one country?",
        ar: "هل سيعمل FAZUMI في بلد واحد فقط؟",
      },
      answer: {
        en: "No. FAZUMI is being built for busy families across the GCC, not for one city or one school system only.",
        ar: "لا. يتم بناء FAZUMI للعائلات المشغولة في مختلف دول الخليج، وليس لمدينة واحدة أو نظام مدرسي واحد فقط.",
      },
    },
    {
      question: {
        en: "What if I join early and the product changes?",
        ar: "ماذا لو انضممت مبكرًا ثم تغير المنتج؟",
      },
      answer: {
        en: "That is part of the point of joining early. Founder Supporters get a closer feedback relationship as the product improves, while the founder-only perks remain tied to the supporter offer.",
        ar: "هذا جزء أساسي من فكرة الانضمام المبكر. يحصل Founder Supporters على علاقة ملاحظات أقرب أثناء تطور المنتج، بينما تبقى المزايا الخاصة بالداعمين مرتبطة بالعرض المبكر.",
      },
    },
    {
      question: {
        en: "Is my payment recurring?",
        ar: "هل الدفعة متكررة؟",
      },
      answer: {
        en: "No. The Founder Supporter payment is one-time, not recurring.",
        ar: "لا. دفعة Founder Supporter تتم مرة واحدة وليست متكررة.",
      },
    },
    {
      question: {
        en: "Why should I join now instead of later?",
        ar: "لماذا أنضم الآن بدلًا من الانتظار؟",
      },
      answer: {
        en: "Because the founder spots are limited, the supporter perks are early-only, and joining now gives you a closer voice while FAZUMI is still taking shape.",
        ar: "لأن المقاعد محدودة، والمزايا خاصة بالداعمين الأوائل فقط، والانضمام الآن يمنحك صوتًا أقرب بينما لا يزال FAZUMI يتشكل.",
      },
    },
  ] satisfies FaqItem[],
  finalCta: {
    title: {
      en: "Join the first 350 parents helping shape FAZUMI",
      ar: "انضم إلى أول 350 من الآباء الذين يساعدون في تشكيل FAZUMI",
    },
    body: {
      en: "If school WhatsApp messages are noisy, stressful, and easy to lose track of, FAZUMI is being built for you.",
      ar: "إذا كانت رسائل المدرسة على واتساب مزدحمة ومربكة ويسهل أن تضيع تفاصيلها، فـ FAZUMI يُبنى لأجلك.",
    },
    bullets: [
      {
        en: "Premium access",
        ar: "وصول مميز",
      },
      {
        en: "Founder-only perks",
        ar: "مزايا خاصة بالداعمين الأوائل",
      },
      {
        en: "Early influence",
        ar: "تأثير مبكر",
      },
      {
        en: "A calmer way to manage school communication",
        ar: "طريقة أهدأ لإدارة تواصل المدرسة",
      },
    ],
    cta: {
      en: "Claim My Founder Spot — $149",
      ar: "احجز مقعدي كمؤسس داعم — $149",
    },
    supportText: {
      en: "Limited to 350 Founder Supporters",
      ar: "محدود بـ 350 من Founder Supporters",
    },
  },
} as const;
