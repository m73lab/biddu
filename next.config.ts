import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  i18n: {
    locales: ["es"],
    defaultLocale: "es",
  },
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    optimizePackageImports: [
      "next-intl",
      "@iconify/tailwind4",
      "lucide-react",
      "framer-motion",
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://vercel.live https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://www.gstatic.com https:",
              "font-src 'self' data:",
              "connect-src 'self' https://www.google.com https: ws://127.0.0.1:* ws://192.168.1.16:* wss://192.168.1.16:* wss://127.0.0.1:* ws://localhost:* wss://localhost:* wss://*.pusher.com",
              "frame-src 'self' https://www.google.com https://www.recaptcha.net https://vercel.live",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://accounts.google.com https://login.microsoftonline.com",
              "object-src 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
