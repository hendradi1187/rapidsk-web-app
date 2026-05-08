import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";

// API Base URL — direct absolute URL (no proxy). Vite proxy was bypassing
// CORS but possibly altering request shape that backend depends on for
// email-trigger logic. Direct call mimics Swagger behavior 1:1.
// If CORS error returns, ask backend dev to whitelist localhost:8282.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://45.158.126.171:8182";

// Create axios instance with default configuration
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for adding auth token, logging, etc.
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("auth_token");
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
    // Handle common errors
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // Handle unauthorized - clear token and redirect to login
          localStorage.removeItem("auth_token");
          // Only redirect if not already on login page
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          break;
        case 403:
          console.error("Access forbidden");
          break;
        case 404:
          console.error("Resource not found");
          break;
        case 422:
          // Validation error - handled by caller
          break;
        case 500:
          console.error("Server error");
          break;
      }
    } else if (error.request) {
      console.error("Network error - no response received");
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

export default apiClient;
