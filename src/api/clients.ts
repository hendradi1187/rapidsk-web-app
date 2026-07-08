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
import { decodeJwt } from "@/lib/jwt";
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

// ── Token helpers ─────────────────────────────────────────────────────────────

const readLegacyToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  const payload = decodeJwt(token);
  const exp = Number(payload?.exp ?? 0);
  if (!exp) return false; // tidak ada claim exp → anggap tidak expired
  return Date.now() >= exp * 1000;
};

// ── Logout policy ─────────────────────────────────────────────────────────────

const isForceLogoutPath = (url: string): boolean =>
  AUTH_FORCE_LOGOUT_PATHS.some((ep) => url.includes(ep));

const isSilentPath = (url: string): boolean =>
  AUTH_SILENT_401_PATHS.some((ep) => url.includes(ep));

/**
 * Tentukan apakah 401 harus memaksa logout user.
 *
 * Aturan (dari yang paling spesifik ke umum):
 * 1. Path auth-infra (validate/refresh/revoke) → SELALU force logout
 * 2. Path silent (IAM perms/policy-bundle) → TIDAK pernah force logout
 * 3. Token tidak ada → force logout
 * 4. Token sudah expired → force logout
 * 5. Token masih valid → TIDAK force logout (kemungkinan izin kurang, bukan sesi invalid)
 */
const shouldForceLogout = (error: AxiosError): boolean => {
  const url = String(error.config?.url ?? "");

  if (isForceLogoutPath(url)) return true;
  if (isSilentPath(url)) return false;

  const token = readLegacyToken();
  if (!token) return true;
  return isTokenExpired(token);
};

const performLogout = (clientName: string, url: string): void => {
  localStorage.removeItem("auth_token");
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    console.warn(`[${clientName}][401] Session expired, redirecting to login. url=${url}`);
    window.location.href = "/login";
  }
};

// ── Client factory ────────────────────────────────────────────────────────────

function createServiceClient(
  name: string,
  getBaseUrl: () => string,
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
    (error: AxiosError) => {
      const parsedMessage = getApiErrorMessage(error);
      error.message = parsedMessage;

      if (error.response) {
        const url = String(error.config?.url ?? "");

        switch (error.response.status) {
          case 401:
            if (shouldForceLogout(error)) {
              performLogout(name, url);
            } else {
              console.warn(`[${name}][401] Ditolak tanpa mematikan sesi:`, url);
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

/** connectorClient — connector runtime, providers, connection pool */
export const connectorClient: AxiosInstance = createServiceClient("connector", getConnectorServiceBaseUrl);

/** adapterClient — adapter workspace, OGC, geospatial runtime */
export const adapterClient: AxiosInstance = createServiceClient("adapter", getAdapterServiceBaseUrl);

/** monitoringClient — audit logs, heartbeats, transfer projections */
export const monitoringClient: AxiosInstance = createServiceClient("monitoring", getMonitoringServiceBaseUrl);

// ── Register ke runtime-config registry ──────────────────────────────────────
registerLogicalClient("auth", authClient);
registerLogicalClient("cts", ctsClient);
registerLogicalClient("connector", connectorClient);
registerLogicalClient("adapter", adapterClient);
registerLogicalClient("monitoring", monitoringClient);
