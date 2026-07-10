/**
 * service-tokens.ts — Token per-audience untuk backend split (CTS/connector/adapter).
 *
 * Backend split memakai audience berbeda per service:
 *   - CTS         (8581) : aud "gxspace-cts"          → token login default
 *   - CONNECTOR   (8582/8583): aud "gxspace-connector"
 *   - OGC_ADAPTER (8584) : aud "gxspace-ogc-adapter"
 *
 * Token login hanya beraudience CTS, jadi service lain (connector/adapter) menolak
 * dengan 401 "Audience doesn't match". Solusi (terbukti live): cetak token per
 * audience dari refresh_token via POST /auth/refresh-token { refresh_token, application_code }.
 * refresh_token lama tetap valid setelah dipakai, jadi aman dipanggil beberapa kali.
 */

import { AUTH } from "@/api/endpoints";
import { decodeJwt } from "@/lib/jwt";

interface CachedToken {
  token: string;
  expMs: number; // epoch ms kapan token expired
}

const cache = new Map<string, CachedToken>();
const inflight = new Map<string, Promise<string | null>>();

const SKEW_MS = 60_000; // refresh 60 detik sebelum expired

const readRefreshToken = (): string | null =>
  typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;

const expiryMs = (token: string): number => {
  const exp = Number(decodeJwt(token)?.exp ?? 0);
  return exp > 0 ? exp * 1000 : Date.now() + 5 * 60_000; // fallback 5 menit
};

const mint = async (applicationCode: string): Promise<string | null> => {
  const refreshToken = readRefreshToken();
  if (!refreshToken) return null;
  try {
    const { getAuthServiceBaseUrl } = await import("@/lib/runtime-config");
    const res = await fetch(`${getAuthServiceBaseUrl()}${AUTH.REFRESH_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken, application_code: applicationCode }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const token: string | undefined = data?.access_token;
    if (!token) return null;
    cache.set(applicationCode, { token, expMs: expiryMs(token) });
    // Rotasi refresh_token bila BE mengembalikan yang baru (yang lama tetap valid).
    if (data?.refresh_token && typeof window !== "undefined") {
      localStorage.setItem("refresh_token", data.refresh_token);
    }
    return token;
  } catch {
    return null;
  }
};

/**
 * Ambil access token untuk sebuah application_code (audience). Di-cache sampai
 * mendekati expiry. Panggilan paralel untuk appCode sama berbagi satu request.
 * Return null kalau tak ada refresh_token / BE menolak.
 */
export const getServiceToken = async (applicationCode: string): Promise<string | null> => {
  const cached = cache.get(applicationCode);
  if (cached && cached.expMs - Date.now() > SKEW_MS) return cached.token;

  const existing = inflight.get(applicationCode);
  if (existing) return existing;

  const p = mint(applicationCode).finally(() => inflight.delete(applicationCode));
  inflight.set(applicationCode, p);
  return p;
};

/** Bersihkan cache saat logout. */
export const clearServiceTokens = (): void => {
  cache.clear();
  inflight.clear();
};
