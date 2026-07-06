import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import {
  ensureValidToken,
  getKeycloakToken,
  isKeycloakConfigured,
} from "@/auth/keycloak";
import { getApiErrorMessage } from "@/lib/api-error";
import { getFrontendApiBasePath } from "@/lib/runtime-config";
import { decodeJwt } from "@/lib/jwt";

// API Base URL - can be configured via environment variable
// Dev: pakai path relatif → lewat Vite proxy (bypass CORS)
// Prod: set VITE_API_BASE_URL ke URL BE lengkap
const API_BASE_URL = getFrontendApiBasePath();

// Create axios instance with default configuration
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

const AUTH_LOGOUT_ENDPOINTS = [
  "/identity-provider/auth/validate",
  "/identity-provider/auth/refresh-token",
  "/identity-provider/auth/revoke-token",
  "/identity-provider/auth/revoke-user-token",
];

const readLegacyToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
};

const isTokenExpired = (token: string | null) => {
  if (!token) return true;
  const payload = decodeJwt(token);
  const exp = Number(payload?.exp ?? 0);
  if (!exp) return false;
  return Date.now() >= exp * 1000;
};

const shouldForceLogoutOnUnauthorized = (error: AxiosError) => {
  const requestUrl = String(error.config?.url ?? "");
  if (AUTH_LOGOUT_ENDPOINTS.some((endpoint) => requestUrl.includes(endpoint))) {
    return true;
  }

  const token = readLegacyToken();
  if (!token) {
    return true;
  }

  return isTokenExpired(token);
};

// Request interceptor for adding auth token, logging, etc.
apiClient.interceptors.request.use(
  async (config) => {
    // ─── Token resolution ──────────────────────────────────────────────
    // Priority 1: Keycloak (Phase 1B) — single JWT untuk dua backend.
    // Priority 2: localStorage `auth_token` (legacy rapiDSK login fallback).
    let token: string | null = null;

    if (isKeycloakConfigured()) {
      const refreshed = await ensureValidToken(30);
      if (refreshed) {
        token = getKeycloakToken();
      }
    }

    if (!token) {
      token = localStorage.getItem("auth_token");
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    const parsedMessage = getApiErrorMessage(error);
    error.message = parsedMessage;

    // Handle common errors
    if (error.response) {
      switch (error.response.status) {
        case 401:
          if (shouldForceLogoutOnUnauthorized(error)) {
            localStorage.removeItem("auth_token");
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
          } else {
            console.warn("[401] Request ditolak tanpa mematikan sesi utama:", requestUrlFromError(error));
          }
          break;
        case 403:
          console.error(parsedMessage);
          break;
        case 404:
          console.error(parsedMessage);
          break;
        case 422:
          // Validation error - handled by caller; detail in error.response.data
          if (import.meta.env.DEV) {
            console.error("[422]", error.config?.url, JSON.stringify(error.response.data));
          }
          break;
        case 500:
          console.error(parsedMessage);
          break;
      }
    } else if (error.request) {
      console.error(parsedMessage);
    }

    return Promise.reject(error);
  }
);

// Generic API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: string;
}

export interface ValidationError {
  errors: Record<string, string[]>;
}

// Pagination params
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Generic request helper with error typing
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}

function requestUrlFromError(error: AxiosError) {
  return String(error.config?.url ?? "unknown");
}

export default apiClient;
