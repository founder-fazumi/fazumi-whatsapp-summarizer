"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  variantId: string;
  children: React.ReactNode;
  className?: string;
  isLoggedIn?: boolean;
}

export function CheckoutButton({ variantId, children, className, isLoggedIn = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!isLoggedIn) {
      router.push("/login?next=/pricing");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant: variantId }),
        redirect: "manual",
      });

      // The API returns a 307 redirect to LS checkout
      const location = res.headers.get("location") ?? res.url;
      if (location && location.includes("lemonsqueezy.com")) {
        window.location.href = location;
      } else if (res.status === 401) {
        router.push("/login?next=/pricing");
      }
    } catch {
      // fallback: navigate to pricing
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? "Redirecting…" : children}
    </button>
  );
}
