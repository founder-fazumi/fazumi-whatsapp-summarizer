"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { captureRouteException } from "@/lib/sentry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);

    void captureRouteException(error, {
      route: "global-error",
      requestId: "global-error",
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {error.message || "A global error occurred."}
              </p>
              <div className="flex gap-2">
                <Button onClick={reset}>Try again</Button>
                <Button variant="outline" onClick={() => (window.location.href = "/")}>
                  Go home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}