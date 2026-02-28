import { LocalizedText } from "@/components/i18n/LocalizedText";

export function SocialProof() {
  const stats = [
    {
      value: "12,500+",
      label: {
        en: "parents using Fazumi",
        ar: "ولي أمر يستخدمون Fazumi",
      },
    },
    {
      value: "94%",
      label: {
        en: "say it saves time daily",
        ar: "يقولون إنه يوفر الوقت يوميًا",
      },
    },
    {
      value: "EN / AR",
      label: {
        en: "bilingual output",
        ar: "مخرجات ثنائية اللغة",
      },
    },
    {
      value: "< 15 sec",
      label: {
        en: "average summary time",
        ar: "متوسط وقت التلخيص",
      },
    },
  ];

  return (
    <section className="border-y border-[var(--border)] bg-[var(--card)] py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-6">
          <LocalizedText
            en="Trusted by parents across GCC schools"
            ar="موثوق به من أولياء الأمور في مدارس الخليج"
          />
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(({ value, label }) => (
            <div key={label.en}>
              <p className="text-2xl font-bold text-[var(--primary)]">{value}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                <LocalizedText en={label.en} ar={label.ar} />
              </p>
            </div>
          ))}
        </div>

        {/* School logos placeholder */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 opacity-40">
          {["Al Wakra School", "Doha Academy", "SEK Qatar", "DPS Modern Indian", "ACS Doha"].map((name) => (
            <span key={name} className="text-xs font-medium text-[var(--foreground)] border border-[var(--border)] rounded-full px-3 py-1">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
