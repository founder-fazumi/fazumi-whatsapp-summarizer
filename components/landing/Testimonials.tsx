import { LocalizedText } from "@/components/i18n/LocalizedText";

const TESTIMONIALS = [
  { name: "Fatima Al-Rashidi",  role: "Parent of 2 · Al Khor",         quote: "Finally, I understand what happens in my daughter's class every week. No more guessing!", stars: 5 },
  { name: "Ahmed Hassan",       role: "Parent · Doha",                  quote: "The Arabic output is perfect — clear, accurate, and reads naturally. Exactly what I needed.", stars: 5 },
  { name: "Sarah Mitchell",     role: "Expat parent · Al Wakra",        quote: "Game changer for busy parents. What used to take me 20 minutes takes 30 seconds now.", stars: 5 },
  { name: "Noor Al-Ali",        role: "Parent · Lusail",                quote: "I never miss a homework deadline anymore. The action items are always spot on.", stars: 5 },
  { name: "Michael Chen",       role: "Parent · West Bay",              quote: "Best parenting tool I have used this school year. Simple, fast, and reliable.", stars: 5 },
  { name: "Layla Ibrahim",      role: "Parent · Education City",        quote: "The To-Do items save me hours every week. I just check Fazumi in the morning and I'm set.", stars: 5 },
  { name: "Omar Al-Sulaiti",    role: "Parent of 3 · The Pearl",        quote: "Love how it handles both English and Arabic groups. My kids go to two schools!", stars: 5 },
  { name: "Priya Nair",         role: "Parent · Msheireb",              quote: "My mother-in-law uses the Arabic version and now she's part of the school conversation.", stars: 4 },
  { name: "Hassan Al-Dosari",   role: "Parent · Al Thumama",            quote: "Fast, private, and accurate. I recommended it to the entire parent committee.", stars: 5 },
  { name: "Amira Khalil",       role: "Parent · Madinat Khalifa",       quote: "The summary even caught an event I completely missed in 300 messages. Impressive.", stars: 5 },
  { name: "James O'Brien",      role: "Expat parent · Al Sadd",         quote: "Dead simple to use. Paste, click, done. My wife and I share the summaries every morning.", stars: 5 },
  { name: "Rania Mahmoud",      role: "Parent · Old Airport",           quote: "As a working mom I don't have time to scroll. Fazumi gives me exactly what I need to know.", stars: 5 },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < count ? "text-amber-400" : "text-[var(--border)]"}>★</span>
      ))}
    </div>
  );
}

function TestimonialCard({ name, role, quote, stars }: typeof TESTIMONIALS[0]) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)] mb-4">
      <StarRating count={stars} />
      <p className="mt-3 text-sm text-[var(--foreground)] leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-bold text-[var(--primary)]">
          {name[0]}
        </div>
        <div>
          <p className="text-xs font-semibold text-[var(--foreground)]">{name}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">{role}</p>
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
    <section className="py-16 bg-[var(--background)] overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)] mb-2">
            <LocalizedText en="Testimonials" ar="آراء العملاء" />
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            <LocalizedText en="Parents love Fazumi" ar="أولياء الأمور يحبون Fazumi" />
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
