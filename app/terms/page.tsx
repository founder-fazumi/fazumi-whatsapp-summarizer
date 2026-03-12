"use client";

import Link from "next/link";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BILLING_CONTACT_EMAIL,
  LEGAL_CONTACT_EMAIL,
  LEGAL_GOVERNING_LAW,
} from "@/lib/config/legal";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LAST_UPDATED = "2026-03-13";

interface TermsSection {
  title: LocalizedCopy<string>;
  body: LocalizedCopy<string>;
  items?: LocalizedCopy<readonly string[]>;
  links?: readonly {
    href: string;
    label: LocalizedCopy<string>;
  }[];
  emails?: readonly string[];
}

const COPY = {
  eyebrow: { en: "Legal", ar: "قانوني" },
  title: { en: "Terms of Service", ar: "شروط الخدمة" },
  description: {
    en: "The rules for using Fazumi's chat summarization service, saved history, and paid plans.",
    ar: "القواعد التي تنظم استخدام خدمة Fazumi لتلخيص المحادثات وسجل الملخصات والخطط المدفوعة.",
  },
  lastUpdated: {
    en: `Last updated: ${LAST_UPDATED}`,
    ar: `آخر تحديث: ${LAST_UPDATED}`,
  },
  sections: [
    {
      title: {
        en: "1. Who we are and acceptance of these Terms",
        ar: "1. من نحن وقبول هذه الشروط",
      },
      body: {
        en: "Fazumi is an independently operated web app from Qatar for parents and guardians. It turns busy parent group chats into structured summary cards so families can catch important dates, tasks, and school updates faster. These Terms apply whenever you create an account, start a trial, buy a plan, or otherwise use Fazumi.",
        ar: "Fazumi هو تطبيق ويب يُدار بشكل مستقل من قطر للآباء والأمهات وأولياء الأمور. يحول محادثات مجموعات أولياء الأمور المزدحمة إلى بطاقات ملخص منظمة حتى تتمكن العائلات من التقاط التواريخ المهمة والمهام والتحديثات المدرسية بسرعة أكبر. تنطبق هذه الشروط عند إنشاء حساب أو بدء فترة تجريبية أو شراء خطة أو استخدام Fazumi بأي شكل.",
      },
      items: {
        en: [
          "The service currently supports pasted or uploaded text from WhatsApp, Telegram, and Facebook Messenger chats.",
          "If you do not agree to these Terms, do not use the service.",
        ],
        ar: [
          "تدعم الخدمة حاليًا النصوص التي يتم لصقها أو رفعها من محادثات WhatsApp وTelegram وFacebook Messenger.",
          "إذا لم توافق على هذه الشروط، فلا تستخدم الخدمة.",
        ],
      },
    },
    {
      title: {
        en: "2. Eligibility and account responsibility",
        ar: "2. الأهلية ومسؤولية الحساب",
      },
      body: {
        en: "Fazumi is intended for adults who are legally able to enter into a binding agreement and who are authorized to access the chats they submit.",
        ar: "Fazumi مخصص للبالغين القادرين قانونيًا على إبرام اتفاق ملزم والمصرح لهم بالوصول إلى المحادثات التي يرسلونها.",
      },
      items: {
        en: [
          "You must provide accurate account information and keep it reasonably up to date.",
          "Keep your login credentials secure and do not let others use your account without permission.",
          "You are responsible for activity that happens through your account.",
        ],
        ar: [
          "يجب تقديم معلومات حساب دقيقة وتحديثها بشكل معقول عند الحاجة.",
          "احفظ بيانات تسجيل الدخول بشكل آمن ولا تسمح للآخرين باستخدام حسابك دون إذن.",
          "أنت مسؤول عن أي نشاط يتم عبر حسابك.",
        ],
      },
    },
    {
      title: { en: "3. Description of the service", ar: "3. وصف الخدمة" },
      body: {
        en: "Fazumi uses OpenAI to generate summaries and Supabase to run authentication, saved history, and core account data. Product features may change over time as we improve the service.",
        ar: "يستخدم Fazumi واجهة OpenAI لإنشاء الملخصات وSupabase لتشغيل المصادقة وسجل الملخصات وبيانات الحساب الأساسية. وقد تتغير ميزات المنتج بمرور الوقت مع تطوير الخدمة.",
      },
      items: {
        en: [
          "Summary cards may include a TL;DR, important dates, action items, people or classes, links, and follow-up questions.",
          "When you are signed in, saved summaries appear in your history.",
          "You may choose English, Arabic, or automatic language handling where available.",
        ],
        ar: [
          "قد تتضمن بطاقات الملخص خلاصة سريعة وتواريخ مهمة ومهام وأشخاصًا أو صفوفًا وروابط وأسئلة متابعة.",
          "عند تسجيل الدخول، تظهر الملخصات المحفوظة في سجلك.",
          "يمكنك اختيار الإنجليزية أو العربية أو المعالجة التلقائية للغة عند توفرها.",
        ],
      },
    },
    {
      title: { en: "4. Your content", ar: "4. المحتوى الخاص بك" },
      body: {
        en: "You may submit chat text and related text files for summarization. You keep the rights you already have in that content.",
        ar: "يمكنك إرسال نص المحادثة والملفات النصية المرتبطة به للتلخيص. وتبقى لك الحقوق التي تملكها أصلًا في هذا المحتوى.",
      },
      items: {
        en: [
          "You represent that you have the right to submit the content and to ask Fazumi to process it.",
          "You give Fazumi a limited, non-exclusive license to host, transmit, and process that content only to provide, secure, and support the service.",
          "Raw chat text is processed during the summarization request and is not stored in your account history or the summaries table.",
          "We store only the generated summary card, extracted structured fields, and limited operational metadata needed to run the service.",
        ],
        ar: [
          "أنت تقر بأن لديك الحق في إرسال المحتوى وطلب معالجته عبر Fazumi.",
          "وتمنح Fazumi ترخيصًا محدودًا وغير حصري لاستضافة هذا المحتوى ونقله ومعالجته فقط لتقديم الخدمة وتأمينها ودعمها.",
          "يتم التعامل مع نص المحادثة الخام أثناء طلب التلخيص ولا يتم حفظه في سجل حسابك أو في جدول الملخصات.",
          "نحن نحفظ فقط بطاقة الملخص الناتجة والعناصر المنظمة المستخرجة والبيانات التشغيلية المحدودة اللازمة لتشغيل الخدمة.",
        ],
      },
    },
    {
      title: { en: "5. Acceptable use", ar: "5. الاستخدام المقبول" },
      body: {
        en: "You must use Fazumi lawfully, respectfully, and within the limits of the product.",
        ar: "يجب استخدام Fazumi بطريقة قانونية ومحترمة وضمن حدود المنتج.",
      },
      items: {
        en: [
          "Do not use the service for illegal content, threats, harassment, hate, exploitation, or other abusive conduct.",
          "Do not submit malware, attempt to gain unauthorized access, scrape the service, reverse engineer it, or interfere with its normal operation.",
          "Do not try to bypass usage limits, billing controls, security measures, or account restrictions.",
          "Do not use Fazumi to process chats you are not authorized to access.",
        ],
        ar: [
          "لا تستخدم الخدمة للمحتوى غير القانوني أو التهديد أو المضايقة أو الكراهية أو الاستغلال أو أي سلوك مسيء آخر.",
          "ولا ترسل برمجيات خبيثة أو تحاول الوصول غير المصرح به أو كشط الخدمة أو عكس هندستها أو تعطيل عملها المعتاد.",
          "ولا تحاول تجاوز حدود الاستخدام أو ضوابط الفوترة أو إجراءات الأمان أو قيود الحساب.",
          "ولا تستخدم Fazumi لمعالجة محادثات لا تملك صلاحية الوصول إليها.",
        ],
      },
    },
    {
      title: {
        en: "6. AI output and verification",
        ar: "6. مخرجات الذكاء الاصطناعي وضرورة التحقق",
      },
      body: {
        en: "Summaries are generated automatically and may be incomplete, inaccurate, or missing context.",
        ar: "يتم إنشاء الملخصات بشكل آلي وقد تكون غير مكتملة أو غير دقيقة أو تفتقد إلى بعض السياق.",
      },
      items: {
        en: [
          "Always verify time-sensitive school details, including deadlines, fees, transport changes, attendance rules, and policy notices, against the original chat, school portal, teacher, or school office.",
          "Do not rely on Fazumi alone for urgent, legal, medical, safety-critical, or financial decisions.",
        ],
        ar: [
          "تحقق دائمًا من التفاصيل المدرسية الحساسة زمنيًا، بما في ذلك المواعيد النهائية والرسوم وتغييرات النقل وقواعد الحضور والإشعارات التنظيمية، بالرجوع إلى المحادثة الأصلية أو بوابة المدرسة أو المعلم أو إدارة المدرسة.",
          "ولا تعتمد على Fazumi وحده في القرارات العاجلة أو القانونية أو الطبية أو الحساسة للسلامة أو المالية.",
        ],
      },
    },
    {
      title: {
        en: "7. Subscriptions, billing, cancellation, and refunds",
        ar: "7. الاشتراكات والفوترة والإلغاء والاسترداد",
      },
      body: {
        en: "Paid plans may be sold and billed through an authorised payment partner or Merchant of Record shown at checkout. That partner handles checkout, recurring billing, invoices, and refund-processing standards for the transaction.",
        ar: "قد تُباع الخطط المدفوعة وتُفوتر عبر شريك دفع معتمد أو تاجر رسمي يظهر عند الدفع. ويتولى ذلك الشريك معالجة الدفع والفوترة المتكررة والفواتير ومعايير معالجة الاسترداد الخاصة بالمعاملة.",
      },
      items: {
        en: [
          "Monthly and annual plans renew automatically until canceled before the next billing date.",
          "Founder access is a one-time purchase and does not renew.",
          "You can manage or cancel a subscription through the billing portal linked in your account or checkout emails.",
          "We do not store full payment card numbers.",
          "Customers may request a refund within 14 days of the initial purchase. Cancellation stops future renewals. Eligible requests are handled under our Refund Policy and the authorised payment partner or Merchant of Record standards shown at checkout.",
        ],
        ar: [
          "تتجدد الخطتان الشهرية والسنوية تلقائيًا ما لم يتم الإلغاء قبل تاريخ الفوترة التالي.",
          "أما وصول Founder فهو شراء لمرة واحدة ولا يتجدد.",
          "يمكنك إدارة الاشتراك أو إلغاؤه من خلال بوابة الفوترة المرتبطة داخل حسابك أو في رسائل الدفع الإلكترونية.",
          "نحن لا نحفظ أرقام بطاقات الدفع الكاملة.",
          "يمكن للعملاء طلب استرداد المبلغ خلال 14 يومًا من تاريخ الشراء الأول. ويؤدي الإلغاء إلى إيقاف التجديدات المستقبلية. وتتم معالجة الطلبات المؤهلة وفق سياسة الاسترداد ومعايير شريك الدفع المعتمد أو التاجر الرسمي الموضحة عند الدفع.",
        ],
      },
      links: [
        {
          href: "/refunds",
          label: {
            en: "Read the Refund Policy",
            ar: "اقرأ سياسة الاسترداد",
          },
        },
      ],
      emails: [BILLING_CONTACT_EMAIL],
    },
    {
      title: { en: "8. Privacy", ar: "8. الخصوصية" },
      body: {
        en: "Our Privacy Policy explains what personal data we collect, how we use it, and how we handle cookies and consent choices.",
        ar: "توضح سياسة الخصوصية البيانات الشخصية التي نجمعها وكيف نستخدمها وكيف نتعامل مع ملفات الارتباط وخيارات الموافقة.",
      },
      links: [
        {
          href: "/privacy",
          label: {
            en: "Read the Privacy Policy",
            ar: "اقرأ سياسة الخصوصية",
          },
        },
      ],
    },
    {
      title: { en: "9. Intellectual property", ar: "9. الملكية الفكرية" },
      body: {
        en: "Fazumi and its licensors own the software, design, branding, and other product materials, except for content that belongs to users or third parties.",
        ar: "يملك Fazumi والجهات المرخصة له البرنامج والتصميم والعلامة والمواد الأخرى الخاصة بالمنتج، باستثناء المحتوى الذي يعود للمستخدمين أو للغير.",
      },
      items: {
        en: [
          "As between you and Fazumi, you keep your rights in the chat text you submit.",
          "You may use the summary cards generated for your own family coordination, school follow-up, and lawful personal use.",
          "You may not copy our product code, branding, or protected materials except as the law allows.",
        ],
        ar: [
          "فيما بينك وبين Fazumi، تبقى لك حقوقك في نص المحادثة الذي ترسله.",
          "يمكنك استخدام بطاقات الملخص الناتجة للتنسيق العائلي ومتابعة المدرسة والاستخدام الشخصي المشروع.",
          "ولا يجوز لك نسخ كود المنتج أو علامته أو مواده المحمية إلا بالقدر الذي يسمح به القانون.",
        ],
      },
    },
    {
      title: { en: "10. Suspension and termination", ar: "10. التعليق والإنهاء" },
      body: {
        en: "You may stop using Fazumi at any time. We may suspend or terminate access if you break these Terms, misuse the product, create risk for other users, or expose Fazumi to legal or security harm.",
        ar: "يمكنك التوقف عن استخدام Fazumi في أي وقت. ويجوز لنا تعليق الوصول أو إنهاؤه إذا خالفت هذه الشروط أو أسأت استخدام المنتج أو خلقت خطرًا على المستخدمين الآخرين أو عرضت Fazumi لضرر قانوني أو أمني.",
      },
      items: {
        en: [
          "If your account is terminated, your right to use the service stops immediately.",
          "You can request account deletion by emailing us from your registered address.",
          "Sections that should reasonably survive termination, including billing, liability, indemnity, and dispute terms, will continue to apply.",
        ],
        ar: [
          "إذا تم إنهاء حسابك، ينتهي حقك في استخدام الخدمة فورًا.",
          "يمكنك طلب حذف الحساب عبر مراسلتنا من بريدك الإلكتروني المسجل.",
          "تستمر الأحكام التي يُفترض منطقيًا أن تبقى بعد الإنهاء، بما في ذلك الفوترة والمسؤولية والتعويض وتسوية النزاعات.",
        ],
      },
      emails: [LEGAL_CONTACT_EMAIL],
    },
    {
      title: {
        en: "11. Disclaimers and limitation of liability",
        ar: "11. إخلاءات المسؤولية وحدود المسؤولية",
      },
      body: {
        en: 'To the maximum extent permitted by law, Fazumi is provided "as is" and "as available". We do not guarantee uninterrupted service, error-free output, or that the service will always meet every need.',
        ar: 'إلى أقصى حد يسمح به القانون، يتم تقديم Fazumi "كما هو" و"بحسب التوفر". ولا نضمن خدمة غير منقطعة أو مخرجات خالية من الأخطاء أو أن تلبي الخدمة كل احتياج على الدوام.',
      },
      items: {
        en: [
          "To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, goodwill, or business opportunity.",
          "Our total liability for any claim related to Fazumi will not exceed the greater of the amount you paid us in the 12 months before the claim arose or USD 100.",
          "Nothing in these Terms excludes liability that cannot legally be excluded.",
        ],
        ar: [
          "إلى أقصى حد يسمح به القانون، لا نتحمل المسؤولية عن الأضرار غير المباشرة أو العرضية أو الخاصة أو التبعية أو العقابية، ولا عن خسارة الأرباح أو البيانات أو السمعة أو الفرص التجارية.",
          "لن تتجاوز مسؤوليتنا الإجمالية عن أي مطالبة متعلقة بـ Fazumi المبلغ الأكبر من: ما دفعته لنا خلال الاثني عشر شهرًا السابقة لنشوء المطالبة أو 100 دولار أمريكي.",
          "ولا يستبعد أي جزء من هذه الشروط المسؤولية التي لا يجوز استبعادها قانونًا.",
        ],
      },
    },
    {
      title: { en: "12. Indemnity", ar: "12. التعويض" },
      body: {
        en: "You agree to defend, indemnify, and hold Fazumi and its team harmless from claims, losses, liabilities, and costs that arise out of your submitted content, your misuse of the service, or your breach of these Terms.",
        ar: "توافق على الدفاع عن Fazumi وفريقه وتعويضهم وإبراء ذمتهم من المطالبات والخسائر والمسؤوليات والتكاليف الناشئة عن المحتوى الذي ترسله أو إساءة استخدامك للخدمة أو مخالفتك لهذه الشروط.",
      },
    },
    {
      title: { en: "13. Governing law and disputes", ar: "13. القانون الواجب التطبيق والنزاعات" },
      body: LEGAL_GOVERNING_LAW,
      items: {
        en: [
          "If mandatory consumer protection law gives you additional non-waivable rights, those rights still apply.",
        ],
        ar: [
          "إذا منحك قانون حماية المستهلك الإلزامي حقوقًا إضافية غير قابلة للتنازل، فإن تلك الحقوق تبقى سارية.",
        ],
      },
    },
    {
      title: { en: "14. Changes to these Terms", ar: "14. التغييرات على هذه الشروط" },
      body: {
        en: "We may update these Terms from time to time to reflect product, billing, legal, or operational changes. We will post the revised version on this page and update the date above.",
        ar: "قد نحدّث هذه الشروط من وقت لآخر لتعكس تغييرات المنتج أو الفوترة أو المتطلبات القانونية أو التشغيلية. وسننشر النسخة المحدثة على هذه الصفحة ونقوم بتحديث التاريخ الموضح أعلاه.",
      },
      items: {
        en: [
          "If changes are material, we may also notify you in-product or by email.",
          "By continuing to use Fazumi after the updated Terms take effect, you accept the revised Terms.",
        ],
        ar: [
          "إذا كانت التغييرات جوهرية، فقد نبلغك أيضًا داخل المنتج أو عبر البريد الإلكتروني.",
          "يعني استمرارك في استخدام Fazumi بعد سريان الشروط المحدثة أنك تقبل النسخة المعدلة.",
        ],
      },
    },
    {
      title: { en: "15. Contact", ar: "15. التواصل" },
      body: {
        en: "Questions about these Terms, billing, or legal notices can be sent to:",
        ar: "يمكن إرسال الاستفسارات المتعلقة بهذه الشروط أو الفوترة أو الإشعارات القانونية إلى:",
      },
      emails: [LEGAL_CONTACT_EMAIL, BILLING_CONTACT_EMAIL],
    },
  ] satisfies readonly TermsSection[],
} as const;

export default function TermsPage() {
  const { locale } = useLang();
  const isArabic = locale === "ar";

  return (
    <PublicPageShell
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      description={COPY.description}
    >
      <div
        dir={isArabic ? "rtl" : "ltr"}
        lang={locale}
        className="reading-shell space-y-4"
      >
        <p className={cn("text-xs text-[var(--muted-foreground)]", isArabic && "text-right")}>
          <LocalizedText en={COPY.lastUpdated.en} ar={COPY.lastUpdated.ar} />
        </p>

        {COPY.sections.map((section) => {
          const items = section.items ? pick(section.items, locale) : [];
          const links = section.links ?? [];
          const emails = section.emails ?? [];

          return (
            <Card key={section.title.en}>
              <CardHeader className={cn(isArabic && "text-right")}>
                <CardTitle>{pick(section.title, locale)}</CardTitle>
              </CardHeader>
              <CardContent className={cn("space-y-3", isArabic && "text-right")}>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(section.body, locale)}
                </p>

                {items.length > 0 ? (
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
                ) : null}

                {links.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {links.map((link) => (
                      <Link
                        key={`${section.title.en}-${link.href}`}
                        href={link.href}
                        className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
                      >
                        {pick(link.label, locale)}
                      </Link>
                    ))}
                  </div>
                ) : null}

                {emails.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {emails.map((email) => (
                      <a
                        key={`${section.title.en}-${email}`}
                        href={`mailto:${email}`}
                        className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
                        dir="ltr"
                      >
                        {email}
                      </a>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PublicPageShell>
  );
}
