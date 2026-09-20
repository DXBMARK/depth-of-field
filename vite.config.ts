import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  // Vercel serves the app from the domain root; only GitHub Pages needs the subpath.
  base: process.env.VERCEL ? "/" : "/depth-of-field/",
  plugins: [react()],
});
