import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:8185";
  const devPort = parseInt(env.VITE_DEV_PORT || "8282", 10);

  return {
    server: {
      host: "0.0.0.0",
      port: devPort,
      strictPort: true,
      hmr: { overlay: false },
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        // Adapter service (8186) — strip /adapter-service prefix before forwarding.
        // OGC adapter only supports GET on /ogc/collections/*/items; connector BE calls
        // documentation_url with POST, so we convert POST→GET here transparently.
        "/adapter-service": {
          target: (env.VITE_ADAPTER_TARGET || proxyTarget.replace(":8185", ":8186")),
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/adapter-service/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              if (
                req.method === "POST" &&
                /\/ogc\/collections\/[^/]+\/items/.test(req.url || "")
              ) {
                proxyReq.method = "GET";
                proxyReq.removeHeader("content-length");
                proxyReq.removeHeader("content-type");
              }
            });
          },
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: devPort,
      strictPort: true,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
