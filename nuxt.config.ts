const isProduction = process.env.NODE_ENV === "production";

const productionSecurityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'self'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data: https:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https:",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "upgrade-insecure-requests",
  ].join("; "),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": [
    "accelerometer=()",
    "autoplay=()",
    "camera=()",
    "display-capture=()",
    "encrypted-media=()",
    "fullscreen=(self)",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "payment=()",
    "picture-in-picture=()",
    "publickey-credentials-get=()",
    "usb=()",
  ].join(", "),
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
  "Origin-Agent-Cluster": "?1",
  "X-DNS-Prefetch-Control": "off",
  "X-Download-Options": "noopen",
  "X-Permitted-Cross-Domain-Policies": "none",
  "X-XSS-Protection": "0",
} as const;

export default defineNuxtConfig({
  modules: [
    "@nuxt/ui",
    "@nuxtjs/supabase",
    "@nuxt/eslint",
  ],

  css: [
    "~/assets/css/main.css",
  ],

  devtools: {
    enabled: process.env.NODE_ENV !== "production",
  },

  runtimeConfig: {
    securityContactEmail: process.env.SECURITY_CONTACT_EMAIL || "",

    public: {
      // Hosted SNCBT-AMS canonical origin. Override with NUXT_PUBLIC_APP_URL
      // when intentionally running another environment.
      appUrl: "https://sncbt-assess.autox.workers.dev",
    },
  },

  supabase: {
    redirect: false,
    useSsrCookies: true,
    types: "~/types/database.types.ts",
  },

  typescript: {
    strict: true,
  },

  routeRules: isProduction
    ? {
        "/**": {
          headers: productionSecurityHeaders,
        },
      }
    : {},

  app: {
    head: {
      titleTemplate: "%s · SNCBT Assess",
      title: "SNCBT Assess",
      meta: [
        {
          name: "description",
          content:
            "Assessment and classroom management system for St. Nicolas College of Business and Technology.",
        },
        {
          name: "theme-color",
          content: "#1d4ed8",
        },
      ],
    },
  },
});
