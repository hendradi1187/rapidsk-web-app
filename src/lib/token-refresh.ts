/**
 * token-refresh.ts — Silent token refresh untuk legacy (non-Keycloak) path.
 *
 * Keycloak sudah punya built-in onTokenExpired + updateToken(30).
 * File ini handle legacy JWT: proaktif refresh 60 detik sebelum expired
 * agar user tidak kena logout tiba-tiba saat sedang aktif.
 *
 * CARA PAKAI:
 *   Panggil startLegacyTokenRefresh() sekali saat user berhasil login.
 *   Panggil stopLegacyTokenRefresh() saat logout.
 *
 * ENDPOINT:
 *   POST /identity-provider/auth/refresh-token
 *   Body: { token: string }
 *   Response: { access_token: string } | { token: string }
 */

import { AUTH } from "@/api/endpoints";
import { decodeJwt } from "@/lib/jwt";

const REFRESH_LEAD_SECONDS = 60;   // refresh 60 detik sebelum exp
const CHECK_INTERVAL_MS    = 30_000; // cek setiap 30 detik

let refreshTimer: ReturnType<typeof setInterval> | null = null;
let isRefreshing = false;

const readToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

const saveToken = (token: string): void => {
  if (typeof window !== "undefined") localStorage.setItem("auth_token", token);
};

const getExpSeconds = (token: string): number | null => {
  const payload = decodeJwt(token);
  const exp = Number(payload?.exp ?? 0);
  return exp > 0 ? exp : null;
};

const secondsUntilExpiry = (token: string): number => {
  const exp = getExpSeconds(token);
  if (!exp) return Infinity;
  return exp - Math.floor(Date.now() / 1000);
};

/**
 * Coba refresh token via BE. Return true kalau berhasil.
 * Gagal diam-diam — AuthContext / interceptor yang handle logout kalau memang expired.
 */
export const tryRefreshLegacyToken = async (): Promise<boolean> => {
  if (isRefreshing) return false;
  const token = readToken();
  if (!token) return false;

  isRefreshing = true;
  try {
    // Base URL diambil dari runtime-config — sama dengan authClient baseURL
    const { getAuthServiceBaseUrl } = await import("@/lib/runtime-config");
    const baseUrl = getAuthServiceBaseUrl();

    const res = await fetch(`${baseUrl}${AUTH.REFRESH_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    const newToken: string | undefined = data?.access_token ?? data?.token;
    if (newToken) {
      saveToken(newToken);
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    isRefreshing = false;
  }
};

/**
 * Mulai interval cek token. Kalau token akan expired dalam REFRESH_LEAD_SECONDS,
 * otomatis refresh. Dipanggil sekali setelah legacy login berhasil.
 */
export const startLegacyTokenRefresh = (): void => {
  stopLegacyTokenRefresh(); // clear timer lama kalau ada

  refreshTimer = setInterval(async () => {
    const token = readToken();
    if (!token) {
      stopLegacyTokenRefresh();
      return;
    }

    const remaining = secondsUntilExpiry(token);

    // Token sudah expired → biarkan interceptor handle (tidak perlu action di sini)
    if (remaining <= 0) {
      stopLegacyTokenRefresh();
      return;
    }

    // Approaching expiry → refresh proaktif
    if (remaining <= REFRESH_LEAD_SECONDS) {
      const ok = await tryRefreshLegacyToken();
      if (import.meta.env.DEV) {
        console.log(`[token-refresh] refresh ${ok ? "OK" : "FAILED"}, remaining=${remaining}s`);
      }
    }
  }, CHECK_INTERVAL_MS);
};

/**
 * Stop interval cek token. Dipanggil saat logout.
 */
export const stopLegacyTokenRefresh = (): void => {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};
