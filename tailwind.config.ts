import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx,js,jsx,mdx}", "./components/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        panablue: "#0a1156",
        panadark: "#070b3e",
        brand: "var(--color-brand)",
        gold: "var(--color-gold)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        light: "var(--color-light)",
        soft: "var(--color-soft)",
      },
      borderRadius: {
        xl: "var(--radius-xl)",
      },
    },
  },
  plugins: [],
};
export default config;
