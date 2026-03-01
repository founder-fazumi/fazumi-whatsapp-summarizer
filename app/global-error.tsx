"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-slate-900">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Unexpected Error
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            We hit a problem loading this page.
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Refresh and try again. If it keeps happening, the error has already been reported.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
