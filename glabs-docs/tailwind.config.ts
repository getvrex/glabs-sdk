import { createPreset } from "fumadocs-ui/tailwind-plugin";
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/fumadocs-ui/dist/**/*.js",
  ],
  presets: [createPreset()],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "hsl(262 83% 58%)",
          foreground: "hsl(0 0% 100%)",
        },
        accent: {
          DEFAULT: "hsl(217 91% 60%)",
          foreground: "hsl(0 0% 100%)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        mono: ["var(--font-jetbrains)"],
        logo: ["var(--font-orbitron)"],
      },
    },
  },
};

export default config;
