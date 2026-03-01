"use client";

import { LocalizedText } from "@/components/i18n/LocalizedText";
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";

const TESTIMONIALS = [
  { name: "Fatima Al-Rashidi",
    role:  { en: "Parent of 2 · Al Khor",        ar: "أم لطفلين · الخور" },
    quote: { en: "Finally, I understand what happens in my daughter's class every week. No more guessing!",
             ar: "أخيرًا أفهم ما يجري في فصل ابنتي كل أسبوع. لا مزيد من التخمين!" }, stars: 5 },
  { name: "Ahmed Hassan",
    role:  { en: "Parent · Doha",                ar: "والد · الدوحة" },
    quote: { en: "The Arabic output is perfect — clear, accurate, and reads naturally. Exactly what I needed.",
             ar: "الإخراج بالعربية مثالي — واضح ودقيق وطبيعي. بالضبط ما أحتاجه." }, stars: 5 },
  { name: "Sarah Mitchell",
    role:  { en: "Expat parent · Al Wakra",       ar: "والدة وافدة · الوكرة" },
    quote: { en: "Game changer for busy parents. What used to take me 20 minutes takes 30 seconds now.",
             ar: "تغيير جذري للآباء المشغولين. ما كان يستغرق 20 دقيقة أصبح 30 ثانية فقط." }, stars: 5 },
  { name: "Noor Al-Ali",
    role:  { en: "Parent · Lusail",               ar: "والدة · لوسيل" },
    quote: { en: "I never miss a homework deadline anymore. The action items are always spot on.",
             ar: "لم أفوّت موعد واجب منذ ذلك. بنود المهام دائمًا في محلها." }, stars: 5 },
  { name: "Michael Chen",
    role:  { en: "Parent · West Bay",             ar: "والد · ويست باي" },
    quote: { en: "Best parenting tool I have used this school year. Simple, fast, and reliable.",
             ar: "أفضل أداة استخدمتها هذا العام الدراسي. بسيطة وسريعة وموثوقة." }, stars: 5 },
  { name: "Layla Ibrahim",
    role:  { en: "Parent · Education City",       ar: "والدة · مدينة التعليم" },
    quote: { en: "The To-Do items save me hours every week. I just check Fazumi in the morning and I'm set.",
             ar: "بنود المهام توفر لي ساعات كل أسبوع. أتحقق من Fazumi صباحًا وأكون مستعدة." }, stars: 5 },
  { name: "Omar Al-Sulaiti",
    role:  { en: "Parent of 3 · The Pearl",       ar: "أب لثلاثة · اللؤلؤة" },
    quote: { en: "Love how it handles both English and Arabic groups. My kids go to two schools!",
             ar: "أحب كيف يتعامل مع مجموعات اللغتين. أطفالي في مدرستين مختلفتين!" }, stars: 5 },
  { name: "Priya Nair",
    role:  { en: "Parent · Msheireb",             ar: "والدة · مشيرب" },
    quote: { en: "My mother-in-law uses the Arabic version and now she's part of the school conversation.",
             ar: "حماتي تستخدم النسخة العربية وأصبحت الآن جزءًا من محادثة المدرسة." }, stars: 4 },
  { name: "Hassan Al-Dosari",
    role:  { en: "Parent · Al Thumama",           ar: "والد · الثمامة" },
    quote: { en: "Fast, private, and accurate. I recommended it to the entire parent committee.",
             ar: "سريع وخاص ودقيق. أوصيت به لكامل لجنة أولياء الأمور." }, stars: 5 },
  { name: "Amira Khalil",
    role:  { en: "Parent · Madinat Khalifa",      ar: "والدة · مدينة خليفة" },
    quote: { en: "The summary even caught an event I completely missed in 300 messages. Impressive.",
             ar: "الملخص اكتشف حدثًا أغفلته تمامًا في 300 رسالة. مثير للإعجاب." }, stars: 5 },
  { name: "James O'Brien",
    role:  { en: "Expat parent · Al Sadd",        ar: "والد وافد · السد" },
    quote: { en: "Dead simple to use. Paste, click, done. My wife and I share the summaries every morning.",
             ar: "بسيط للغاية. لصق ونقر وتم. أنا وزوجتي نتشارك الملخصات كل صباح." }, stars: 5 },
  { name: "Rania Mahmoud",
    role:  { en: "Parent · Old Airport",          ar: "والدة · المطار القديم" },
    quote: { en: "As a working mom I don't have time to scroll. Fazumi gives me exactly what I need to know.",
             ar: "بصفتي أمًا عاملة لا وقت لديّ للتمرير. Fazumi يعطيني بالضبط ما أحتاج معرفته." }, stars: 5 },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < count ? "text-[var(--accent-fox)]" : "text-[var(--border)]"}>★</span>
      ))}
    </div>
  );
}

function TestimonialCard({ name, role, quote, stars }: typeof TESTIMONIALS[0]) {
  const { locale } = useLang();

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      className="surface-panel mb-4 px-5 py-5"
    >
      <StarRating count={stars} />
      <p className="mt-3 text-sm text-[var(--foreground)] leading-relaxed">&ldquo;{pick(quote, locale)}&rdquo;</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)]">
          {name[0]}
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--foreground)]">{name}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">{pick(role, locale)}</p>
        </div>
      </div>
    </div>
  );
}

function TestimonialsColumn({
  items,
  duration,
}: {
  items: typeof TESTIMONIALS;
  duration: number;
}) {
  // Duplicate for seamless loop
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden">
      <div
        className="testimonials-col"
        style={{ "--duration": `${duration}s` } as React.CSSProperties}
      >
        {doubled.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} {...t} />
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  const col1 = TESTIMONIALS.slice(0, 4);
  const col2 = TESTIMONIALS.slice(4, 8);
  const col3 = TESTIMONIALS.slice(8, 12);

  return (
    <section className="overflow-hidden py-16 md:py-24">
      <div className="page-shell">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)] mb-2">
            <LocalizedText en="Testimonials" ar="آراء العملاء" />
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            <LocalizedText en="Parents love Fazumi" ar="أولياء الأمور يحبّون Fazumi" />
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            <LocalizedText
              en="Join 12,500+ parents who save time every week"
              ar="انضم إلى 12,500 من أولياء الأمور الذين يوفرون الوقت كل أسبوع"
            />
          </p>
        </div>

        <div className="relative">
          {/* Top + bottom fade masks */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-16 z-10 bg-gradient-to-b from-[var(--background)] to-transparent" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 z-10 bg-gradient-to-t from-[var(--background)] to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[560px] overflow-hidden">
            <TestimonialsColumn items={col1} duration={28} />
            <div className="hidden sm:block">
              <TestimonialsColumn items={col2} duration={34} />
            </div>
            <div className="hidden lg:block">
              <TestimonialsColumn items={col3} duration={22} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
