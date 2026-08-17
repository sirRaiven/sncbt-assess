export default defineAppConfig({
  ui: {
    colors: {
      primary: "brand",
      secondary: "indigo",
      success: "green",
      info: "sky",
      warning: "amber",
      error: "red",
      neutral: "slate",
    },
    icons: {
      loading: "i-lucide-loader-circle",
      search: "i-lucide-search",
      menu: "i-lucide-menu",
    },
    card: {
      slots: {
        root: [
          "bg-default/95 ring-1 ring-default/75",
          "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_30px_rgba(15,23,42,0.065)]",
          "dark:shadow-[0_1px_2px_rgba(0,0,0,0.22),0_16px_38px_rgba(0,0,0,0.18)]",
        ].join(" "),
        header: "border-default/70",
        footer: "border-default/70",
      },
    },
  },
});
