import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import {
  ensureValidToken,
  getKeycloakToken,
  isKeycloakConfigured,
} from "@/auth/keycloak";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getFrontendAdapterRuntimeBasePath,
  getFrontendApiBasePath,
  type RuntimeServiceName,
} from "@/lib/runtime-config";
import { decodeJwt } from "@/lib/jwt";

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

const resolveAccessToken = async () => {
  let token: string | null = null;

  if (isKeycloakConfigured()) {
    const refreshed = await ensureValidToken(30);
    if (refreshed) {
      token = getKeycloakToken();
    }
  }

  if (!token && typeof window !== "undefined") {
    token = localStorage.getItem("auth_token");
  }

  return token;
};

const requestUrlFromError = (error: AxiosError) =>
  String(error.config?.url ?? "unknown");

const attachCommonInterceptors = (
  client: AxiosInstance,
  scope: RuntimeServiceName | "adapter-runtime",
) => {
  client.interceptors.request.use(
    async (config) => {
      const token = await resolveAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (import.meta.env.DEV) {
        console.log(
          `[API:${scope}] ${config.method?.toUpperCase()} ${config.baseURL ?? ""}${config.url ?? ""}`,
        );
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const parsedMessage = getApiErrorMessage(error);
      error.message = parsedMessage;

      if (error.response) {
        switch (error.response.status) {
          case 401:
            if (shouldForceLogoutOnUnauthorized(error)) {
              localStorage.removeItem("auth_token");
              if (window.location.pathname !== "/login") {
                window.location.href = "/login";
              }
            } else {
              console.warn(
                "[401] Request ditolak tanpa mematikan sesi utama:",
                requestUrlFromError(error),
              );
            }
            break;
          case 403:
          case 404:
          case 500:
            console.error(parsedMessage);
            break;
          case 422:
            if (import.meta.env.DEV) {
              console.error(
                "[422]",
                error.config?.url,
                JSON.stringify(error.response.data),
              );
            }
            break;
        }
      } else if (error.request) {
        console.error(parsedMessage);
      }

      return Promise.reject(error);
    },
  );
};

const createServiceClient = (
  scope: RuntimeServiceName | "adapter-runtime",
  baseURL: string,
  timeout = 30000,
): AxiosInstance => {
  const client = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout,
  });
  attachCommonInterceptors(client, scope);
  return client;
};

export const authClient = createServiceClient("auth", getFrontendApiBasePath("auth"));
export const ctsClient = createServiceClient("cts", getFrontendApiBasePath("cts"));
export const connectorClient = createServiceClient(
  "connector",
  getFrontendApiBasePath("connector"),
  45000,
);
export const adapterClient = createServiceClient(
  "adapter",
  getFrontendApiBasePath("adapter"),
  60000,
);
export const monitoringClient = createServiceClient(
  "monitoring",
  getFrontendApiBasePath("monitoring"),
  45000,
);
export const adapterRuntimeClient = createServiceClient(
  "adapter-runtime",
  getFrontendAdapterRuntimeBasePath(),
  60000,
);

export const apiClient: AxiosInstance = ctsClient;

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

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<T>(config);
  return response.data;
}

export default apiClient;
