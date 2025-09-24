import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx,js,jsx,mdx}", "./components/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      colors: {
        panablue: "#0a1156",
        panadark: "#070b3e",
      },
    },
  },
  plugins: [],
};
export default config;
