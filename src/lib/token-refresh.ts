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
// Shared in-flight promise: kalau banyak request kena 401 barengan, semuanya
// menunggu SATU refresh yang sama (bukan trigger refresh berkali-kali).
let refreshPromise: Promise<boolean> | null = null;

const readToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

const readRefreshToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;

const saveToken = (token: string): void => {
  if (typeof window !== "undefined") localStorage.setItem("auth_token", token);
};

const saveRefreshToken = (token: string): void => {
  if (typeof window !== "undefined") localStorage.setItem("refresh_token", token);
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

const doRefresh = async (): Promise<boolean> => {
  // Kontrak live: POST /auth/refresh-token body { refresh_token } → { access_token, refresh_token, ... }
  const refreshToken = readRefreshToken();
  if (!refreshToken) return false;

  try {
    // Base URL diambil dari runtime-config — sama dengan authClient baseURL
    const { getAuthServiceBaseUrl } = await import("@/lib/runtime-config");
    const baseUrl = getAuthServiceBaseUrl();

    const res = await fetch(`${baseUrl}${AUTH.REFRESH_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    const newToken: string | undefined = data?.access_token ?? data?.token;
    if (!newToken) return false;

    saveToken(newToken);
    // Refresh token dirotasi BE → simpan yang baru bila ada.
    if (data?.refresh_token) saveRefreshToken(data.refresh_token);
    return true;
  } catch {
    return false;
  }
};

/**
 * Coba refresh token via BE. Return true kalau berhasil.
 * Otoritas ada di BACKEND: kalau BE menolak (non-2xx) → false → pemanggil yang logout.
 * Aman untuk dipanggil paralel: semua caller menunggu satu refresh yang sama.
 */
export const tryRefreshLegacyToken = async (): Promise<boolean> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
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
