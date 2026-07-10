/**
 * clients.ts — Logical HTTP clients per service domain.
 *
 * Setiap client punya baseURL sendiri yang diambil dari RuntimeServiceMap.
 * Interceptor auth + error handling identik, tapi tiap client bisa diarahkan
 * ke service/port berbeda tanpa FE perlu tahu detail infra BE.
 *
 * Mapping default (single-monolith, backward compat):
 *   auth, cts, connector, monitoring → apiBaseUrl
 *   adapter → adapterEndpoint
 *
 * Saat BE split jadi microservice, cukup update runtime.json:
 *   { "services": { "cts": "http://cts:8280/api/v1", ... } }
 * — FE tidak perlu rebuild.
 *
 * LOGOUT POLICY (non-aggressive):
 *   • 401 dari endpoint auth-infra (validate/refresh/revoke) → force logout
 *   • 401 dari endpoint silent (IAM effective-perms, policy-bundle) → log only
 *   • 401 dari endpoint lain + token sudah expired → force logout
 *   • 401 dari endpoint lain + token masih valid → log only (mungkin izin kurang)
 */

import axios, { type AxiosError, type AxiosInstance } from "axios";
import {
  ensureValidToken,
  getKeycloakToken,
  isKeycloakConfigured,
} from "@/auth/keycloak";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getAuthServiceBaseUrl,
  getCtsServiceBaseUrl,
  getConnectorServiceBaseUrl,
  getAdapterServiceBaseUrl,
  getMonitoringServiceBaseUrl,
  registerLogicalClient,
} from "@/lib/runtime-config";
import {
  AUTH_FORCE_LOGOUT_PATHS,
  AUTH_SILENT_401_PATHS,
} from "@/api/endpoints";
import { tryRefreshLegacyToken } from "@/lib/token-refresh";
import { getServiceToken, clearServiceTokens } from "@/lib/service-tokens";

// ── Token helpers ─────────────────────────────────────────────────────────────

const readLegacyToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

// ── Logout policy ─────────────────────────────────────────────────────────────
//
// Otoritas sesi = BACKEND, bukan tebakan cache lokal. Kita TIDAK lagi men-decode
// exp token dari localStorage untuk memutuskan logout. Alurnya:
//   • 401 dari auth-infra (validate/refresh/revoke) → sesi memang mati → logout
//   • 401 dari path silent (IAM perms/policy-bundle) → log saja
//   • 401 lain → minta BE refresh token; kalau berhasil → retry request;
//     kalau BE menolak refresh → baru logout (backend yang menyatakan sesi mati)
//   • Kalau setelah refresh masih 401 (mis. kurang izin) → diteruskan sebagai error,
//     TIDAK logout (bukan urusan sesi).

const isForceLogoutPath = (url: string): boolean =>
  AUTH_FORCE_LOGOUT_PATHS.some((ep) => url.includes(ep));

const isSilentPath = (url: string): boolean =>
  AUTH_SILENT_401_PATHS.some((ep) => url.includes(ep));

const performLogout = (clientName: string, url: string): void => {
  clearServiceTokens();
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    console.warn(`[${clientName}][401] Backend menolak refresh, sesi diakhiri. url=${url}`);
    window.location.href = "/login";
  }
};

// ── Client factory ────────────────────────────────────────────────────────────

function createServiceClient(
  name: string,
  getBaseUrl: () => string,
  applicationCode?: string,
): AxiosInstance {
  const instance = axios.create({
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
  });

  // ── Request interceptor ───────────────────────────────────────────────────
  instance.interceptors.request.use(
    async (config) => {
      if (!config.baseURL) config.baseURL = getBaseUrl();

      let token: string | null = null;
      if (isKeycloakConfigured()) {
        const refreshed = await ensureValidToken(30);
        if (refreshed) token = getKeycloakToken();
      }
      // Service dgn audience non-CTS (connector/adapter) butuh token ber-audience
      // sesuai. Cetak dari refresh_token via application_code. Kalau gagal, fallback
      // ke token login (biar tidak mem-blok; BE yang akan menolak bila memang perlu).
      if (!token && applicationCode) {
        token = await getServiceToken(applicationCode);
      }
      if (!token) token = readLegacyToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;

      if (import.meta.env.DEV) {
        console.log(`[${name}] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  // ── Response interceptor ──────────────────────────────────────────────────
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const parsedMessage = getApiErrorMessage(error);
      error.message = parsedMessage;

      if (error.response) {
        const url = String(error.config?.url ?? "");
        const config = error.config as (typeof error.config & { _retried?: boolean }) | undefined;

        switch (error.response.status) {
          case 401: {
            // Auth-infra (validate/refresh/revoke) gagal → sesi memang mati.
            if (isForceLogoutPath(url)) {
              performLogout(name, url);
              break;
            }
            // Endpoint silent (IAM perms/policy-bundle) → log saja, jangan ganggu sesi.
            if (isSilentPath(url)) {
              console.warn(`[${name}][401] Ditolak tanpa mematikan sesi:`, url);
              break;
            }
            // Backend-driven: minta refresh, lalu retry SEKALI.
            if (config && !config._retried) {
              config._retried = true;
              const refreshed = await tryRefreshLegacyToken();
              if (refreshed) {
                const newToken = readLegacyToken();
                if (newToken) {
                  config.headers = config.headers ?? {};
                  (config.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
                }
                // Retry; kalau 401 lagi (mis. kurang izin) diteruskan sbg error, TIDAK logout.
                return instance(config);
              }
              // BE menolak refresh → sesi mati → logout.
              performLogout(name, url);
            }
            break;
          }
          case 403:
            console.error(`[${name}][403]`, parsedMessage);
            break;
          case 404:
            console.error(`[${name}][404]`, parsedMessage);
            break;
          case 422:
            if (import.meta.env.DEV) {
              console.error(`[${name}][422]`, url, JSON.stringify(error.response.data));
            }
            break;
          case 500:
            console.error(`[${name}][500]`, parsedMessage);
            break;
        }
      } else if (error.request) {
        console.error(`[${name}] No response:`, parsedMessage);
      }

      return Promise.reject(error);
    },
  );

  return instance;
}

// ── Logical clients ───────────────────────────────────────────────────────────

/** authClient — identity-provider, IAM, auth flows */
export const authClient: AxiosInstance = createServiceClient("auth", getAuthServiceBaseUrl);

/** ctsClient — governance, onboarding, policy-contract, catalog, compliance */
export const ctsClient: AxiosInstance = createServiceClient("cts", getCtsServiceBaseUrl);

/** connectorClient — connector runtime, providers, connection pool (aud gxspace-connector) */
export const connectorClient: AxiosInstance = createServiceClient("connector", getConnectorServiceBaseUrl, "CONNECTOR");

/** adapterClient — adapter workspace, OGC, geospatial runtime (aud gxspace-ogc-adapter) */
export const adapterClient: AxiosInstance = createServiceClient("adapter", getAdapterServiceBaseUrl, "OGC_ADAPTER");

/** monitoringClient — audit logs, heartbeats, transfer projections */
export const monitoringClient: AxiosInstance = createServiceClient("monitoring", getMonitoringServiceBaseUrl);

// ── Register ke runtime-config registry ──────────────────────────────────────
registerLogicalClient("auth", authClient);
registerLogicalClient("cts", ctsClient);
registerLogicalClient("connector", connectorClient);
registerLogicalClient("adapter", adapterClient);
registerLogicalClient("monitoring", monitoringClient);
