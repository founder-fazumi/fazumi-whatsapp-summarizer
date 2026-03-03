"use client";

/**
 * Route Error Boundary
 *
 * Next.js App Router requirements:
 * - Keep this as a client component.
 * - Avoid context-dependent hooks/components during SSR fallback rendering.
 * - Use useEffect only for client-side logging.
 */
import { useEffect } from "react";
import { captureRouteException } from "@/lib/sentry";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void captureRouteException(error, {
      route: "app-router-error",
      requestId: "app-router-error",
      digest: error.digest,
    });
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        backgroundColor: "#f5f2ec",
        color: "#193129",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "420px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            marginBottom: "1rem",
            color: "#247052",
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            marginBottom: "1.5rem",
            color: "#64746d",
          }}
        >
          We logged the issue. Refresh the view or go back to the dashboard.
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#247052",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "white",
              color: "#247052",
              border: "1px solid #d9e2dc",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go home
          </button>
        </div>
        {error ? (
          <details
            style={{
              marginTop: "1.5rem",
              textAlign: "left",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontSize: "0.75rem",
                color: "#a4b4ab",
                marginBottom: "0.5rem",
              }}
            >
              Technical details
            </summary>
            <pre
              style={{
                fontSize: "0.65rem",
                color: "#c24d42",
                overflow: "auto",
                backgroundColor: "#fdecea",
                padding: "0.75rem",
                borderRadius: "0.5rem",
              }}
            >
              {error.message}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}
