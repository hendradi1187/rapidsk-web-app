import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_PROXY_TARGET || "http://192.168.1.55:8581";
  const adapterTarget = env.VITE_ADAPTER_TARGET || "http://192.168.1.55:8584";
  // Connector service (consumer 8582). Provider ops (8583) berbagi path yang sama;
  // consumer melayani list/status + consumer & provider ops di demo ini.
  const connectorTarget = env.VITE_CONNECTOR_TARGET || "http://100.66.10.14:8582";
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
        // Connector service (8582) — strip /connector-api prefix sebelum forward.
        // Dipakai connectorClient (audience gxspace-connector) untuk transfer dsb.
        "/connector-api": {
          target: connectorTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/connector-api/, ""),
        },
        // Adapter service (8584) — strip /adapter-service prefix before forwarding.
        // OGC adapter only supports GET on /ogc/ogc/collections/*/items; connector BE calls
        // documentation_url with POST, so we convert POST→GET here transparently.
        "/adapter-service": {
          target: adapterTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/adapter-service/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              if (
                req.method === "POST" &&
                /\/ogc\/ogc\/collections\/[^/]+\/items/.test(req.url || "")
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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            framework: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "axios"],
            maps: ["maplibre-gl"],
            charts: ["recharts"],
            motion: ["framer-motion"],
            keycloak: ["keycloak-js"],
          },
        },
      },
      chunkSizeWarningLimit: 1200,
    },
  };
});

