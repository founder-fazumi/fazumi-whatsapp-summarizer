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
    <section className="page-section-tight">
      <div className="page-shell">
        <div className="surface-panel-elevated px-[var(--card-padding-lg)] py-8">
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            <LocalizedText
              en="Trusted by parents across GCC schools"
              ar="موثوق به من أولياء الأمور في مدارس الخليج"
            />
          </p>

          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {stats.map(({ value, label }) => (
              <div key={label.en} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-5 shadow-[var(--shadow-xs)]">
                <p className="text-2xl font-bold text-[var(--primary)]">{value}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  <LocalizedText en={label.en} ar={label.ar} />
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {["Al Wakra School", "Doha Academy", "SEK Qatar", "DPS Modern Indian", "ACS Doha"].map((name) => (
              <span key={name} className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
