import type { Config } from "tailwindcss";

/**
 * Design tokens are defined ONCE as CSS variables in globals.css (the system design system:
 * primary green #16A34A, Cairo typeface, 8px spacing grid, 8/12px radii).
 * Tailwind only references the variables — no module may introduce its own palette.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "rgb(var(--c-primary) / <alpha-value>)", soft: "rgb(var(--c-primary-soft) / <alpha-value>)", ink: "rgb(var(--c-primary-ink) / <alpha-value>)" },
        ink: { DEFAULT: "rgb(var(--c-ink) / <alpha-value>)", soft: "rgb(var(--c-ink-soft) / <alpha-value>)", faint: "rgb(var(--c-ink-faint) / <alpha-value>)" },
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        card: "rgb(var(--c-card) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        danger: { DEFAULT: "rgb(var(--c-danger) / <alpha-value>)", soft: "rgb(var(--c-danger-soft) / <alpha-value>)" },
        warn: { DEFAULT: "rgb(var(--c-warn) / <alpha-value>)", soft: "rgb(var(--c-warn-soft) / <alpha-value>)" },
        info: { DEFAULT: "rgb(var(--c-info) / <alpha-value>)", soft: "rgb(var(--c-info-soft) / <alpha-value>)" },
      },
      borderRadius: { card: "12px", el: "8px" },
      fontFamily: { sans: ["var(--font-cairo)", "system-ui", "sans-serif"] },
      boxShadow: {
        card: "0 1px 2px rgb(15 27 20 / 0.05), 0 4px 16px -8px rgb(15 27 20 / 0.08)",
        pop: "0 8px 32px -8px rgb(15 27 20 / 0.22)",
      },
    },
  },
  plugins: [],
};
export default config;
