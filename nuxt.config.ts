const isProduction = process.env.NODE_ENV === "production";

const pwaNoCacheHeaders = {
  "Cache-Control":
    "no-cache, no-store, must-revalidate",
  Pragma:
    "no-cache",
  Expires:
    "0",
} as const;

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
    "@vite-pwa/nuxt",
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

  pwa: {
    registerType:
      "prompt",

    injectRegister:
      "auto",

    includeAssets: [
      "favicon.ico",
      "favicon-32x32.png",
      "apple-touch-icon.png",
      "icons/sncbt-logo-192.png",
      "icons/sncbt-logo-512.png",
    ],

    manifest: {
      id:
        "/",
      name:
        "SNCBT Assess",
      short_name:
        "SNCBT Assess",
      description:
        "Classroom assessment workspace for instructors and students of St. Nicolas College of Business and Technology.",
      start_url:
        "/",
      scope:
        "/",
      display:
        "standalone",
      background_color:
        "#0f172a",
      theme_color:
        "#1d4ed8",
      lang:
        "en",
      categories: [
        "education",
        "productivity",
      ],
      icons: [
        {
          src:
            "/icons/sncbt-logo-192.png",
          sizes:
            "192x192",
          type:
            "image/png",
          purpose:
            "any",
        },
        {
          src:
            "/icons/sncbt-logo-512.png",
          sizes:
            "512x512",
          type:
            "image/png",
          purpose:
            "any",
        },
      ],
    },

    client: {
      installPrompt:
        true,
      registerPlugin:
        true,
    },

    workbox: {
      cleanupOutdatedCaches:
        true,

      // The installed app should never rely on cached assessment pages or
      // Supabase responses. Only versioned static application assets are
      // precached; live assessment data always comes from the network.
      globPatterns: [
        "**/*.{js,css,ico,png,svg,woff,woff2}",
      ],

      navigateFallback:
        null,
    },

    devOptions: {
      // Keep service workers out of normal hot-reload development to avoid
      // confusing cached behavior. Set NUXT_PWA_DEV=true only when you
      // intentionally want to test install behavior under `npm run dev`.
      enabled:
        process.env.NUXT_PWA_DEV
        === "true",
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
          headers:
            productionSecurityHeaders,
        },

        "/sw.js": {
          headers: {
            ...productionSecurityHeaders,
            ...pwaNoCacheHeaders,
          },
        },

        "/registerSW.js": {
          headers: {
            ...productionSecurityHeaders,
            ...pwaNoCacheHeaders,
          },
        },

        "/manifest.webmanifest": {
          headers: {
            ...productionSecurityHeaders,
            ...pwaNoCacheHeaders,
          },
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
        {
          name:
            "mobile-web-app-capable",
          content:
            "yes",
        },
        {
          name:
            "apple-mobile-web-app-capable",
          content:
            "yes",
        },
        {
          name:
            "apple-mobile-web-app-status-bar-style",
          content:
            "default",
        },
        {
          name:
            "apple-mobile-web-app-title",
          content:
            "SNCBT Assess",
        },
      ],

      link: [
        {
          rel:
            "apple-touch-icon",
          href:
            "/apple-touch-icon.png",
        },
      ],
    },
  },
});
