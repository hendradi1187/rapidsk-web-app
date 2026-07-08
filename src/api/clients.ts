/**
 * clients.ts — Logical HTTP clients per service domain
 *
 * Setiap client punya baseURL sendiri yang diambil dari RuntimeServiceMap.
 * Interceptor auth + error handling identik dengan apiClient lama,
 * tapi sekarang tiap client bisa diarahkan ke service/port yang berbeda
 * tanpa FE perlu tahu detail infra BE.
 *
 * Mapping default (single-monolith, backward compat):
 *   auth, cts, connector, monitoring → apiBaseUrl
 *   adapter → adapterEndpoint
 *
 * Saat BE split jadi microservice, cukup update runtime.json:
 *   { "services": { "cts": "http://cts:8280/api/v1", "connector": "http://connector:8281/api/v1", ... } }
 * — FE tidak perlu rebuild.
 */

import axios, { type AxiosError, type AxiosInstance } from "axios";
import {
  ensureValidToken,
  getKeycloakToken,
  isKeycloakConfigured,
} from "@/auth/keycloak";
import { getApiErrorMessage } from "@/lib/api-error";
import { decodeJwt } from "@/lib/jwt";
import {
  getAuthServiceBaseUrl,
  getCtsServiceBaseUrl,
  getConnectorServiceBaseUrl,
  getAdapterServiceBaseUrl,
  getMonitoringServiceBaseUrl,
  registerLogicalClient,
} from "@/lib/runtime-config";

// ─── Auth helpers (shared across all clients) ─────────────────────────────────

const AUTH_LOGOUT_ENDPOINTS = [
  "/identity-provider/auth/validate",
  "/identity-provider/auth/refresh-token",
  "/identity-provider/auth/revoke-token",
  "/identity-provider/auth/revoke-user-token",
];

const readLegacyToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  const payload = decodeJwt(token);
  const exp = Number(payload?.exp ?? 0);
  if (!exp) return false;
  return Date.now() >= exp * 1000;
};

const shouldForceLogoutOnUnauthorized = (error: AxiosError): boolean => {
  const requestUrl = String(error.config?.url ?? "");
  if (AUTH_LOGOUT_ENDPOINTS.some((ep) => requestUrl.includes(ep))) return true;
  const token = readLegacyToken();
  if (!token) return true;
  return isTokenExpired(token);
};

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * createServiceClient — builds an axios instance wired to a specific service.
 * @param name       human label for logs ("cts", "connector", etc.)
 * @param getBaseUrl lazy getter so baseURL is resolved after bootstrap finishes
 */
function createServiceClient(
  name: string,
  getBaseUrl: () => string
): AxiosInstance {
  // baseURL is set lazily in the request interceptor so it picks up the value
  // loaded by initializeRuntime() rather than the default-fallback.
  const instance = axios.create({
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
  });

  // ── Request interceptor ───────────────────────────────────────────────────
  instance.interceptors.request.use(
    async (config) => {
      // Lazy baseURL injection — always reflects the latest runtime config.
      if (!config.baseURL) {
        config.baseURL = getBaseUrl();
      }

      // Token resolution: Keycloak first, legacy fallback.
      let token: string | null = null;
      if (isKeycloakConfigured()) {
        const refreshed = await ensureValidToken(30);
        if (refreshed) token = getKeycloakToken();
      }
      if (!token) token = readLegacyToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;

      if (import.meta.env.DEV) {
        console.log(
          `[${name}] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
        );
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // ── Response interceptor ──────────────────────────────────────────────────
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const parsedMessage = getApiErrorMessage(error);
      error.message = parsedMessage;

      if (error.response) {
        switch (error.response.status) {
          case 401:
            if (shouldForceLogoutOnUnauthorized(error)) {
              localStorage.removeItem("auth_token");
              if (
                typeof window !== "undefined" &&
                window.location.pathname !== "/login"
              ) {
                window.location.href = "/login";
              }
            } else {
              console.warn(
                `[${name}][401] Request ditolak tanpa mematikan sesi:`,
                error.config?.url
              );
            }
            break;
          case 403:
            console.error(`[${name}][403]`, parsedMessage);
            break;
          case 404:
            console.error(`[${name}][404]`, parsedMessage);
            break;
          case 422:
            if (import.meta.env.DEV) {
              console.error(
                `[${name}][422]`,
                error.config?.url,
                JSON.stringify(error.response.data)
              );
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
    }
  );

  return instance;
}

// ─── The 5 logical clients ────────────────────────────────────────────────────

/**
 * authClient — identity-provider, IAM, auth flows
 * Endpoints: /identity-provider/*, /iam/*, /iam-admin/*
 */
export const authClient: AxiosInstance = createServiceClient(
  "auth",
  getAuthServiceBaseUrl
);

/**
 * ctsClient — governance, organizations, domains, onboarding, policy-contract,
 *             catalog, compliance, schemas, vocabularies, juknis
 * Endpoints: /governance/*, /onboarding/*, /policy/*, /catalog/*, etc.
 */
export const ctsClient: AxiosInstance = createServiceClient(
  "cts",
  getCtsServiceBaseUrl
);

/**
 * connectorClient — connector runtime, providers, connection pool
 * Endpoints: /connector/*, /providers/*
 */
export const connectorClient: AxiosInstance = createServiceClient(
  "connector",
  getConnectorServiceBaseUrl
);

/**
 * adapterClient — adapter workspace, OGC, geospatial runtime
 * Endpoints: /adapter/*, /ogc/*
 */
export const adapterClient: AxiosInstance = createServiceClient(
  "adapter",
  getAdapterServiceBaseUrl
);

/**
 * monitoringClient — audit logs, heartbeats, transfer projections
 * Endpoints: /cts/monitoring/*, /audit/*
 */
export const monitoringClient: AxiosInstance = createServiceClient(
  "monitoring",
  getMonitoringServiceBaseUrl
);

// ─── Register ke runtime-config registry ─────────────────────────────────────
// Allows getLogicalClient("cts") elsewhere if needed.

registerLogicalClient("auth", authClient);
registerLogicalClient("cts", ctsClient);
registerLogicalClient("connector", connectorClient);
registerLogicalClient("adapter", adapterClient);
registerLogicalClient("monitoring", monitoringClient);
