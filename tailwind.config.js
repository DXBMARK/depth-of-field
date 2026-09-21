/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        canvas: "#f4f7fb",
        signal: "#2563eb",
      },
      boxShadow: {
        panel: "0 18px 50px rgb(15 23 42 / 0.10)",
      },
    },
  },
  plugins: [],
};
