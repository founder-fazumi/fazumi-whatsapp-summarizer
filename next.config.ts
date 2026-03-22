import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  serverExternalPackages: ["@sentry/nextjs"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings ?? []),
        {
          module: /@opentelemetry[\\/]instrumentation/,
          message: /Critical dependency: the request of a dependency is an expression/,
        },
        {
          module: /require-in-the-middle/,
          message:
            /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
        },
      ];
    }

    return config;
  },
  async rewrites() {
    // /admin-dashboard and /admin-dashboard/login are now real route files —
    // no rewrite needed for those two.
    // Sub-routes (/admin-dashboard/users, /inbox, etc.) are still served from
    // the underlying app/admin_dashboard/(dashboard)/* page files via this rewrite.
    return [
      {
        source: "/admin-dashboard/:path*",
        destination: "/admin_dashboard/:path*",
      },
    ];
  },
  async redirects() {
    return [
      { source: "/signup", destination: "/login?tab=signup", permanent: false },
      // Legacy admin paths — redirect to the canonical /admin-dashboard/* URLs.
      { source: "/admin", destination: "/admin-dashboard", permanent: true },
      {
        source: "/admin/login",
        destination: "/admin-dashboard/login",
        permanent: true,
      },
      {
        source: "/admin_dashboard/login",
        destination: "/admin-dashboard/login",
        permanent: true,
      },
      {
        source: "/admin_dashboard",
        destination: "/admin-dashboard",
        permanent: true,
      },
      {
        source: "/admin_dashboard/:path*",
        destination: "/admin-dashboard/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            // 'unsafe-inline' is required for Next.js inline scripts/styles and the
            // theme-init script in app/layout.tsx.
            // TODO(post-launch): migrate to nonce-based CSP to remove 'unsafe-inline'.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://app.posthog.com https://eu.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.posthog.com https://eu.posthog.com https://*.ingest.sentry.io https://sentry.io",
              "frame-src https://app.lemonsqueezy.com https://*.lemonsqueezy.com",
              "frame-ancestors 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "fazumi",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
