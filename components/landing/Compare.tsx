"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const BEFORE_LINES = [
  "Teacher: Hi everyone! Don't forget about the math test",
  "Parent: What chapters?",
  "Teacher: Chapters 4, 5, 6. Also science project Friday",
  "Parent: What format?",
  "Teacher: PDF or PPT max 10 slides",
  "Parent: When is the field trip?",
  "Teacher: Next Tuesday. Forms by Wednesday",
  "Parent: How much is the fee?",
  "Teacher: 15 QR cash at front office",
  "Parent: 👍",
  "Teacher: Also parent conferences March 15th 3-6pm",
  "Parent 2: Where do we sign up?",
  "Teacher: School app. Link in bio",
  "Parent 3: Ok thanks",
  "Parent 4: 👍👍",
  "Parent 5: Thank you teacher 🙏",
  "Teacher: You're welcome! Good luck on the exam 🍀",
  "Parent 6: Will there be a study guide?",
];

const AFTER_SECTIONS = [
  { icon: "📋", title: "TL;DR", content: "Math test Mon (Ch. 4-6). Science project due Fri. Field trip Tue — forms by Wed." },
  { icon: "📅", title: "Dates", items: ["Math test: Monday", "Science project: Friday", "Field trip: Tuesday", "Parent conf.: March 15, 3–6 PM"] },
  { icon: "✅", title: "Action items", items: ["Study chapters 4-6", "Submit science project (PDF/PPT)", "Return field trip form + 15 QR", "Sign up on school app"] },
];

export function Compare() {
  const [sliderPct, setSliderPct] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setSliderPct(pct);
  }, []);

  return (
    <section className="py-16 bg-[var(--background)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            From noise to clarity
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Drag the slider to see the difference
          </p>
        </div>

        {/* Compare slider */}
        <div
          ref={containerRef}
          className="relative h-[420px] rounded-[var(--radius-xl)] overflow-hidden border border-[var(--border)] cursor-col-resize select-none shadow-[var(--shadow-card)]"
          onMouseMove={(e) => { if (dragging.current) updateSlider(e.clientX); }}
          onMouseDown={(e) => { dragging.current = true; updateSlider(e.clientX); }}
          onMouseUp={() => { dragging.current = false; }}
          onMouseLeave={() => { dragging.current = false; }}
          onTouchMove={(e) => updateSlider(e.touches[0].clientX)}
          onTouchStart={(e) => updateSlider(e.touches[0].clientX)}
        >
          {/* BEFORE panel (full width, clipped by slider) */}
          <div className="absolute inset-0 bg-[#1E1E2E] overflow-hidden">
            <div className="h-8 flex items-center px-4 bg-[#2A2A3E] border-b border-white/10">
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">School Group · 47 messages · 9 mins</span>
            </div>
            <div className="p-4 space-y-2 overflow-hidden h-[calc(100%-2rem)]">
              {BEFORE_LINES.map((line, i) => (
                <p key={i} className={cn(
                  "text-xs font-mono leading-relaxed",
                  line.startsWith("Teacher:") ? "text-emerald-400" : "text-gray-400"
                )}>
                  {line}
                </p>
              ))}
            </div>
          </div>

          {/* AFTER panel (clipped from left by slider) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 0 0 ${sliderPct}%)` }}
          >
            <div className="absolute inset-0 bg-[var(--card)]">
              <div className="h-8 flex items-center px-4 bg-[var(--card-tint)] border-b border-[var(--border)]">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--primary)]">✨ Fazumi Summary</span>
              </div>
              <div className="p-4 space-y-4 overflow-hidden h-[calc(100%-2rem)]">
                {AFTER_SECTIONS.map((sec) => (
                  <div key={sec.title}>
                    <p className="text-[11px] font-bold text-[var(--foreground)] flex items-center gap-1.5 mb-1.5">
                      <span>{sec.icon}</span> {sec.title}
                    </p>
                    {"content" in sec ? (
                      <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{sec.content}</p>
                    ) : (
                      <ul className="space-y-1">
                        {sec.items.map((item) => (
                          <li key={item} className="flex items-start gap-1.5 text-xs text-[var(--foreground)]">
                            <span className="mt-0.5 text-[var(--primary)]">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg z-10"
            style={{ left: `${sliderPct}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--foreground)] select-none">⇔</span>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-10 left-3 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white pointer-events-none">
            Chat noise
          </div>
          <div className="absolute top-10 right-3 rounded-md bg-[var(--primary)]/90 px-2 py-0.5 text-[10px] font-semibold text-white pointer-events-none">
            Fazumi summary
          </div>
        </div>
      </div>
    </section>
  );
}
