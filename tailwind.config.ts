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
        primary: { DEFAULT: "var(--c-primary)", soft: "var(--c-primary-soft)", ink: "var(--c-primary-ink)" },
        ink: { DEFAULT: "var(--c-ink)", soft: "var(--c-ink-soft)", faint: "var(--c-ink-faint)" },
        paper: "var(--c-paper)",
        card: "var(--c-card)",
        line: "var(--c-line)",
        danger: { DEFAULT: "var(--c-danger)", soft: "var(--c-danger-soft)" },
        warn: { DEFAULT: "var(--c-warn)", soft: "var(--c-warn-soft)" },
        info: { DEFAULT: "var(--c-info)", soft: "var(--c-info-soft)" },
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
