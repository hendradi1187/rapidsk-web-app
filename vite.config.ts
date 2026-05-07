import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8282,
    hmr: {
      overlay: false,
    },
    // Dev proxy: forward /api/* to backend so browser sees same-origin
    // (bypasses CORS errors when backend doesn't whitelist localhost:8282).
    // Prod (Docker/nginx) doesn't use this — env VITE_API_BASE_URL takes over.
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || "http://45.158.126.171:8182",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
