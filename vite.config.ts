import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",   // dengarkan semua interface → akses via IP server :8282
    port: 8282,
    strictPort: true,  // jangan auto-pindah port; gagal jika 8282 terpakai
    hmr: {
      overlay: false,
    },
  },
  preview: {
    host: "0.0.0.0",   // `npm run preview` (serve hasil build) juga di :8282 semua interface
    port: 8282,
    strictPort: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
