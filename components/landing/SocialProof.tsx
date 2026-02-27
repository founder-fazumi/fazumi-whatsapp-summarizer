export function SocialProof() {
  const stats = [
    { value: "12,500+", label: "parents using Fazumi" },
    { value: "94%",     label: "find it saves time daily" },
    { value: "EN / AR", label: "bilingual output" },
    { value: "< 15 sec", label: "average summary time" },
  ];

  return (
    <section className="border-y border-[var(--border)] bg-[var(--card)] py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-6">
          Trusted by parents across GCC schools
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-[var(--primary)]">{value}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{label}</p>
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
