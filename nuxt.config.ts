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

  supabase: {
    redirect: false,
    useSsrCookies: true,
    types: "~/types/database.types.ts",
  },

  typescript: {
    strict: true,
  },

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
