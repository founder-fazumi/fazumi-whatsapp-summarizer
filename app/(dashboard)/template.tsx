"use client";

import { useEffect, useRef } from "react";

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    el.style.opacity = "0";
    el.style.transform = "translateY(4px)";

    const raf = requestAnimationFrame(() => {
      el.style.transition = "opacity 0.18s ease, transform 0.18s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });

    return () => cancelAnimationFrame(raf);
  }, []);

  return <div ref={ref}>{children}</div>;
}
