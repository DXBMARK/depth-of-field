import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-soft": "rgb(var(--surface-soft) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        secondary: "rgb(var(--text-secondary) / <alpha-value>)",
        muted: "rgb(var(--text-muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        "line-strong": "rgb(var(--line-strong) / <alpha-value>)",
        signal: "rgb(var(--primary) / <alpha-value>)",
        "signal-hover": "rgb(var(--primary-hover) / <alpha-value>)",
        "signal-soft": "rgb(var(--primary-soft) / <alpha-value>)",
        focusred: "rgb(var(--focus-red) / <alpha-value>)",
        "focus-soft": "rgb(var(--focus-soft) / <alpha-value>)",
      },
      boxShadow: {
        panel: "0 10px 30px rgb(15 23 42 / 0.055)",
        soft: "0 2px 8px rgb(15 23 42 / 0.035)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
